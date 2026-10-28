import {
  CvSnapError,
  toFeedback,
  validatePlan,
  type ProgressStep,
  type ProviderCallOptions,
  type ValidationRun,
} from "@cv-snap/shared";
import type { ProfileRepository } from "@/features/tailoring/ports";
import type { RequirementsResolution } from "@/features/tailoring/requirements-resolution";
import {
  InvalidPlanError,
  type Tailoring,
  type TailoringResult,
} from "@/features/tailoring/tailoring";
import { isInvalidOutput } from "@/features/tailoring/retry";
import { logger } from "@/lib/logger";
import type { GenerationRequest, GenerationResult } from "./generation-result";

/** Per-call limit of the host (bolt 004); the watchdog allows requirements + two tailoring calls. */
const CLAUDE_CALL_MS = 120_000;
export const DEFAULT_WATCHDOG_MS = CLAUDE_CALL_MS * 3 + 10_000;

export interface GenerationPipelineDeps {
  profiles: Pick<ProfileRepository, "getActive">;
  requirements: Pick<RequirementsResolution, "resolve">;
  tailoring: Pick<Tailoring, "tailor">;
  /** Overall deadline: the run always reaches a terminal state (FR-17). */
  watchdogMs?: number;
  now?: () => number;
}

interface Attempt {
  index: 1 | 2;
  result: TailoringResult;
  validation: ValidationRun;
}

const terminalCodes = new Set(["CANCELLED", "HOST_DISCONNECTED"]);

/**
 * The generation pipeline (story 007, ddd-02): confirmed profile → requirements (cached) →
 * tailor → validate → at most one retry with the validator's feedback → the better attempt.
 * Cancel ends in `CANCELLED`, a lost host in `HOST_DISCONNECTED`; every other failure is a typed
 * error; a watchdog guarantees an outcome. Logs carry counts, codes and durations only.
 */
export class GenerationPipeline {
  private readonly now: () => number;

  constructor(private readonly deps: GenerationPipelineDeps) {
    this.now = deps.now ?? (() => Date.now());
  }

  async run(request: GenerationRequest): Promise<GenerationResult> {
    const runId = crypto.randomUUID().slice(0, 8);
    const startedAt = this.now();
    const internal = new AbortController();
    // An object, not a `let`: it is set from a timer callback, which flow analysis doesn't track.
    const watchdogState = { isFired: false };
    const onAbort = () => {
      internal.abort();
    };
    request.signal.addEventListener("abort", onAbort, { once: true });
    if (request.signal.aborted) internal.abort();
    const watchdog = setTimeout(() => {
      watchdogState.isFired = true;
      internal.abort();
    }, this.deps.watchdogMs ?? DEFAULT_WATCHDOG_MS);

    let isFinished = false;
    let lastStep: ProgressStep | null = null;
    const progress = (step: ProgressStep) => {
      if (isFinished || internal.signal.aborted || step === lastStep) return;
      lastStep = step;
      request.onProgress?.(step);
    };
    const options: ProviderCallOptions = {
      model: request.model,
      signal: internal.signal,
      onProgress: progress,
    };
    const checkAborted = () => {
      if (!internal.signal.aborted) return;
      throw watchdogState.isFired
        ? new CvSnapError("GENERATION_TIMEOUT", "Generation took too long")
        : new CvSnapError("CANCELLED", "Generation was cancelled");
    };

    try {
      const profile = await this.deps.profiles.getActive();
      if (!profile || profile.confirmedAt === null) {
        throw new CvSnapError("GENERATION_FAILED", "Confirm your CV profile before generating", {
          reason: "PROFILE_NOT_CONFIRMED",
        });
      }
      checkAborted();

      const requirementsStarted = this.now();
      const resolved = await this.deps.requirements.resolve(request.ad, options);
      const requirementsMs = this.now() - requirementsStarted;
      checkAborted();

      let tailoringMs = 0;
      let validationMs = 0;
      const tailorAndValidate = async (
        index: 1 | 2,
        validatorFeedback: string[] | null,
      ): Promise<Attempt> => {
        progress("tailoring");
        const tailoringStarted = this.now();
        const result = await this.deps.tailoring.tailor(
          {
            profile,
            requirements: resolved.requirements,
            override: request.override,
            validatorFeedback,
          },
          options,
        );
        tailoringMs += this.now() - tailoringStarted;
        checkAborted();
        progress("validating");
        const validationStarted = this.now();
        const validation = validatePlan(result.plan, profile);
        validationMs += this.now() - validationStarted;
        return { index, result, validation };
      };

      let first: Attempt | null = null;
      let feedback: string[] | null = null;
      try {
        first = await tailorAndValidate(1, null);
        if (first.validation.violationCount > 0) feedback = toFeedback(first.validation);
      } catch (error) {
        // A plan that broke a postcondition (language, citations, headings) is retried too
        // (ddd-02 decision 4); transport and provider errors are not.
        if (!isInvalidOutput(error) || internal.signal.aborted) throw error;
        feedback = error instanceof InvalidPlanError ? error.issues.slice(0, 30) : [];
      }

      let chosen: Attempt | null = first;
      let attempts: 1 | 2 = 1;
      if (feedback !== null) {
        checkAborted();
        progress("retrying");
        attempts = 2;
        logger.info(
          "generation retry",
          runId,
          first?.validation.violationCount ?? "invalid-output",
        );
        try {
          const second = await tailorAndValidate(2, feedback);
          chosen = pickBetter(first, second);
        } catch (error) {
          // Keep attempt 1 when the retry fails (even on the watchdog), except when the user
          // cancelled or the host is gone (ddd-02 decision 4).
          if (first === null || request.signal.aborted || isDisconnect(error)) throw error;
          logger.warn("retry failed; keeping the first attempt", runId, codeOf(error));
        }
      }
      if (chosen === null) {
        throw new CvSnapError("GENERATION_FAILED", "Claude didn't return a usable plan", {
          reason: "INVALID_OUTPUT",
        });
      }

      const result: GenerationResult = {
        plan: chosen.result.plan,
        validation: chosen.validation,
        gaps: chosen.result.plan.gaps,
        requirements: resolved.requirements,
        outputLanguage: chosen.result.outputLanguage,
        fromCache: resolved.fromCache,
        attempts,
        chosenAttempt: chosen.index,
        durationsMs: {
          requirements: requirementsMs,
          tailoring: tailoringMs,
          validation: validationMs,
          total: this.now() - startedAt,
        },
      };
      logger.info(
        "generation finished",
        runId,
        { attempts, chosen: chosen.index, ...result.validation.summary },
        result.durationsMs.total,
      );
      return result;
    } catch (error) {
      // The host reports any abort as CANCELLED; the watchdog's abort is a timeout.
      if (watchdogState.isFired && !isDisconnect(error)) {
        throw new CvSnapError("GENERATION_TIMEOUT", "Generation took too long");
      }
      if (request.signal.aborted && !isTerminal(error)) {
        throw new CvSnapError("CANCELLED", "Generation was cancelled");
      }
      logger.warn("generation failed", runId, codeOf(error));
      throw error;
    } finally {
      isFinished = true;
      clearTimeout(watchdog);
      request.signal.removeEventListener("abort", onAbort);
    }
  }
}

/** Fewer violations wins; a tie goes to the retry (ddd-01 decision 4). */
function pickBetter(first: Attempt | null, second: Attempt): Attempt {
  if (first === null) return second;
  return second.validation.violationCount <= first.validation.violationCount ? second : first;
}

function isDisconnect(error: unknown): boolean {
  return error instanceof CvSnapError && error.code === "HOST_DISCONNECTED";
}

function isTerminal(error: unknown): boolean {
  return error instanceof CvSnapError && terminalCodes.has(error.code);
}

function codeOf(error: unknown): string {
  return error instanceof CvSnapError ? error.code : "UNEXPECTED";
}
