import { describe, expect, it } from "vitest";
import { loadFixture } from "../test/fixtures.js";
import { CvProfileContentSchema } from "./cv-profile.js";
import { CvSnapError } from "./errors.js";
import { JobRequirementsSchema } from "./job-requirements.js";
import type { ProgressStep } from "./protocol.js";
import type { CvGenerationProvider, ProviderCallOptions } from "./provider.js";
import { TailoringPlanSchema } from "./tailoring-plan.js";

/** Minimal fake that type-checks against the port; later bolts reuse this pattern in tests. */
function createFakeProvider(): CvGenerationProvider {
  const step = async <T>(
    progress: ProgressStep,
    options: ProviderCallOptions,
    value: T,
  ): Promise<T> => {
    options.onProgress?.(progress);
    await Promise.resolve();
    if (options.signal.aborted) throw new CvSnapError("CANCELLED", "Cancelled");
    return value;
  };
  return {
    checkHealth: () =>
      Promise.resolve({
        hostVersion: "0.1.0",
        claudeFound: true,
        claudeVersion: "2.1.302",
        isAuthenticated: true,
        isVersionSupported: true,
      }),
    createProfile: (_input, options) =>
      step("creating-profile", options, CvProfileContentSchema.parse(loadFixture("profile"))),
    parseRequirements: (_input, options) =>
      step(
        "parsing-requirements",
        options,
        JobRequirementsSchema.parse(loadFixture("requirements")),
      ),
    tailor: (_input, options) =>
      step("tailoring", options, TailoringPlanSchema.parse(loadFixture("plan"))),
  };
}

describe("CvGenerationProvider", () => {
  it("exposes the health check and the three AI steps", () => {
    const provider = createFakeProvider();

    expect(Object.keys(provider).sort()).toEqual(
      ["checkHealth", "createProfile", "parseRequirements", "tailor"].sort(),
    );
  });

  it("reports progress through the callback", async () => {
    const steps: ProgressStep[] = [];

    await createFakeProvider().parseRequirements(
      { adText: "ad", url: null },
      {
        model: "claude-haiku-5-5",
        signal: new AbortController().signal,
        onProgress: (s) => steps.push(s),
      },
    );

    expect(steps).toEqual(["parsing-requirements"]);
  });

  it("can be cancelled through the AbortSignal", async () => {
    const controller = new AbortController();
    controller.abort();

    const call = createFakeProvider().createProfile(
      { cvText: "cv" },
      { model: "claude-sonnet-5-5", signal: controller.signal },
    );

    await expect(call).rejects.toMatchObject({ code: "CANCELLED" });
  });
});
