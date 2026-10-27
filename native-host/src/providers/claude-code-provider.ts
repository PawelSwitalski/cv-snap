import { join } from "node:path";
import {
  assignProfileIds,
  CvProfileExtractionSchema,
  CvSnapError,
  JobRequirementsSchema,
  ParsedCvProfileContentSchema,
  TailoringPlanSchema,
  toClaudeJsonSchema,
  type AiOutputKind,
  type CreateProfileInput,
  type CvGenerationProvider,
  type CvProfileContent,
  type HealthReport,
  type JobRequirements,
  type ParseRequirementsInput,
  type Prompt,
  type PromptBuilders,
  type ProviderCallOptions,
  type TailoringPlan,
  type TailorInput,
} from "@cv-snap/shared";
import type { z } from "zod";
import { checkHealth } from "../health/check-health.js";
import { findClaude, type ClaudeCommand } from "../health/find-claude.js";
import { appDataDir } from "../lib/paths.js";
import { runProcess, type ProcessRunner } from "../lib/run-process.js";
import { runStructured } from "./claude-runner.js";

export interface ClaudeCodeProviderDeps {
  /** Usually the shared `promptBuilders`; injected so tests can use their own. */
  prompts: PromptBuilders;
  findClaude?: () => ClaudeCommand | null;
  run?: ProcessRunner;
  workRoot?: string;
  timeoutMs?: number;
  claudeConfigDir?: string;
}

/**
 * v1 adapter of the `CvGenerationProvider` port: every AI step runs through the user's own
 * headless Claude Code (story 005-claude-code-provider). Outputs are validated with zod before
 * they are returned.
 */
export class ClaudeCodeProvider implements CvGenerationProvider {
  private readonly deps: Required<Omit<ClaudeCodeProviderDeps, "timeoutMs" | "claudeConfigDir">> &
    Pick<ClaudeCodeProviderDeps, "timeoutMs" | "claudeConfigDir">;

  constructor(deps: ClaudeCodeProviderDeps) {
    this.deps = {
      findClaude: () => findClaude(),
      run: runProcess,
      workRoot: join(appDataDir(), "run"),
      ...deps,
    };
  }

  checkHealth(options: { signal: AbortSignal }): Promise<HealthReport> {
    return checkHealth({
      signal: options.signal,
      run: this.deps.run,
      findClaude: this.deps.findClaude,
    });
  }

  async createProfile(
    input: CreateProfileInput,
    options: ProviderCallOptions,
  ): Promise<CvProfileContent> {
    options.onProgress?.("creating-profile");
    // Claude returns the profile without IDs; code assigns them, then the full contract
    // (including unique IDs) is checked once more before the reply leaves the host.
    const extraction = await this.runStep(
      "profile",
      this.deps.prompts.profile(input),
      CvProfileExtractionSchema,
      options,
    );
    return validated(ParsedCvProfileContentSchema, assignProfileIds(extraction));
  }

  async parseRequirements(
    input: ParseRequirementsInput,
    options: ProviderCallOptions,
  ): Promise<JobRequirements> {
    options.onProgress?.("parsing-requirements");
    return this.runStep(
      "requirements",
      this.deps.prompts.requirements(input),
      JobRequirementsSchema,
      options,
    );
  }

  async tailor(input: TailorInput, options: ProviderCallOptions): Promise<TailoringPlan> {
    options.onProgress?.("tailoring");
    return this.runStep("plan", this.deps.prompts.tailor(input), TailoringPlanSchema, options);
  }

  private async runStep<T extends z.ZodType>(
    kind: AiOutputKind,
    prompt: Prompt,
    schema: T,
    options: ProviderCallOptions,
  ): Promise<z.infer<T>> {
    const output = await runStructured({
      claude: this.deps.findClaude(),
      model: options.model,
      prompt,
      jsonSchema: toClaudeJsonSchema(kind),
      signal: options.signal,
      run: this.deps.run,
      workRoot: this.deps.workRoot,
      ...(this.deps.timeoutMs === undefined ? {} : { timeoutMs: this.deps.timeoutMs }),
      ...(this.deps.claudeConfigDir === undefined
        ? {}
        : { claudeConfigDir: this.deps.claudeConfigDir }),
    });
    return validated(schema, output);
  }
}

/** Parses with `schema` or throws `GENERATION_FAILED`/`INVALID_OUTPUT` (retryable). */
function validated<T extends z.ZodType>(schema: T, output: unknown): z.infer<T> {
  const parsed = schema.safeParse(output);
  if (!parsed.success) {
    // Issue details can echo model output (CV text), so they stay out of the message.
    throw new CvSnapError(
      "GENERATION_FAILED",
      "Claude returned data that doesn't match the schema",
      {
        reason: "INVALID_OUTPUT",
      },
    );
  }
  return parsed.data;
}
