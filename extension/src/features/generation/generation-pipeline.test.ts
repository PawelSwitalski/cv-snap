import {
  CvSnapError,
  type CvProfile,
  type ProgressStep,
  type TailoringPlan,
} from "@cv-snap/shared";
import { describe, expect, it } from "vitest";
import { smallPlan, smallProfile } from "../../../test/cv-fixtures";
import { smallRequirements } from "../../../test/tailoring-fixtures";
import type { TailoringRequest } from "@/features/tailoring/tailoring";
import { GenerationPipeline } from "./generation-pipeline";

/** A plan whose bullet invents a number (12 apps) that the profile doesn't have. */
function fabricatedPlan(): TailoringPlan {
  const plan = smallPlan();
  const bullet = plan.items[0]?.bullets[0];
  if (bullet) bullet.text = "Migracja 12 aplikacji do TypeScript.";
  return plan;
}

/** Pipeline over fakes: each tailoring call returns (or throws) the next scripted outcome. */
function pipelineWith(
  outcomes: (TailoringPlan | Error)[],
  profile: CvProfile | null = smallProfile(),
) {
  const tailorCalls: TailoringRequest[] = [];
  const pipeline = new GenerationPipeline({
    profiles: { getActive: () => Promise.resolve(profile) },
    requirements: {
      resolve: () =>
        Promise.resolve({ requirements: smallRequirements(), adKey: "key", fromCache: true }),
    },
    tailoring: {
      tailor: (request) => {
        tailorCalls.push(request);
        const outcome = outcomes[tailorCalls.length - 1];
        if (!outcome) return Promise.reject(new Error("unexpected call"));
        if (outcome instanceof Error) return Promise.reject(outcome);
        return Promise.resolve({ plan: outcome, outputLanguage: { code: "pl", source: "ad" } });
      },
    },
  });
  return { pipeline, tailorCalls };
}

const request = (signal = new AbortController().signal, steps: ProgressStep[] = []) => ({
  ad: {
    text: "ad",
    url: "https://example.com/1",
    structuredFields: null,
    isManualSelection: false,
  },
  override: null,
  model: "claude-haiku-5-5" as const,
  signal,
  onProgress: (step: ProgressStep) => steps.push(step),
});

describe("GenerationPipeline (Stage 4 smoke checks; full tests in Stage 5)", () => {
  it("returns a verified plan after one tailoring call", async () => {
    const { pipeline, tailorCalls } = pipelineWith([smallPlan()]);
    const steps: ProgressStep[] = [];

    const result = await pipeline.run(request(undefined, steps));

    expect(result).toMatchObject({ attempts: 1, chosenAttempt: 1, fromCache: true });
    expect(result.validation.violationCount).toBe(0);
    expect(tailorCalls).toHaveLength(1);
    expect(steps).toEqual(["tailoring", "validating"]);
  });

  it("retries once with the validator's feedback and keeps the better attempt", async () => {
    const { pipeline, tailorCalls } = pipelineWith([fabricatedPlan(), smallPlan()]);
    const steps: ProgressStep[] = [];

    const result = await pipeline.run(request(undefined, steps));

    expect(result).toMatchObject({ attempts: 2, chosenAttempt: 2 });
    expect(tailorCalls[1]?.validatorFeedback).toEqual([
      'items[exp_acme].bullets[0]: number "12" is not in the cited sources',
    ]);
    expect(steps).toContain("retrying");
  });

  it("keeps attempt 1 with its unverified line when the retry fails", async () => {
    const { pipeline } = pipelineWith([
      fabricatedPlan(),
      new CvSnapError("GENERATION_TIMEOUT", "slow"),
    ]);

    const result = await pipeline.run(request());

    expect(result).toMatchObject({ attempts: 2, chosenAttempt: 1 });
    expect(result.validation.summary.unverified).toBe(1);
  });

  it("ends in CANCELLED when the user cancels", async () => {
    const controller = new AbortController();
    controller.abort();
    const { pipeline } = pipelineWith([smallPlan()]);

    await expect(pipeline.run(request(controller.signal))).rejects.toMatchObject({
      code: "CANCELLED",
    });
  });

  it("refuses to run without a confirmed profile", async () => {
    const draft = { ...smallProfile(), confirmedAt: null };
    const { pipeline, tailorCalls } = pipelineWith([smallPlan()], draft);

    await expect(pipeline.run(request())).rejects.toMatchObject({
      reason: "PROFILE_NOT_CONFIRMED",
    });
    expect(tailorCalls).toHaveLength(0);
  });
});
