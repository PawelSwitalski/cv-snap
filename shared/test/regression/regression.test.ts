import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { validatePlan } from "../../src/validation/validate-plan.js";
import { buildInjectionVariants } from "./build-injections.js";
import {
  listFiles,
  listFixtureSets,
  readReviewedProfile,
  readReviewedRecording,
  REGRESSION_ROOT,
} from "./fixture-repository.js";
import { formatReport, totals, type CaseMetrics } from "./metrics.js";
import { scanFiles, scanText } from "./privacy-check.js";
import { seedFabrications } from "./seed-fabrications.js";

/**
 * Regression suite, recorded mode (story 008): replays reviewed recordings offline. It never
 * starts processes and never uses the network; both are blocked here so a slip fails loudly.
 */
vi.mock("node:child_process", () => {
  const blocked = () => {
    throw new Error("The recorded regression suite must not start processes");
  };
  return { spawn: blocked, exec: blocked, execFile: blocked, execSync: blocked, fork: blocked };
});

const realFetch = globalThis.fetch;
beforeAll(() => {
  globalThis.fetch = () =>
    Promise.reject(new Error("The recorded regression suite must not use the network"));
});
afterAll(() => {
  globalThis.fetch = realFetch;
});

const MIN_CVS = 3;
const MIN_ADS = 20;
const sets = listFixtureSets();

describe("regression fixtures: privacy", () => {
  it("contains no e-mail, phone number or street address in any fixture file", () => {
    const findings = scanFiles(listFiles(fileURLToPath(REGRESSION_ROOT)));

    expect(findings).toEqual([]);
  });

  it("detects real-looking contact data but allows reserved fake forms", () => {
    expect(
      scanText("jan.kowalski@gmail.com, +48 601 234 567, ul. Długa 12").map((f) => f.kind),
    ).toEqual(["email", "phone", "address"]);
    expect(scanText("jan.testowy@example.com, +48 000 000 000")).toEqual([]);
  });
});

describe.each(sets.map((set) => [set.name, set] as const))(
  "regression set %s (recorded mode)",
  (_name, set) => {
    const metrics: CaseMetrics[] = [];

    afterAll(() => {
      const reviewedCvs = set.manifest.cvs.filter(
        (cv) => readReviewedProfile(set, cv.id) !== null,
      ).length;
      const isComplete = reviewedCvs >= MIN_CVS && set.manifest.ads.length >= MIN_ADS;
      process.stdout.write(`${formatReport(set.name, metrics, isComplete)}\n`);
    });

    it.each(set.manifest.cases.map((testCase) => [testCase.id, testCase] as const))(
      "case %s: no fabricated fact passes as verified, no injected content leaks",
      (caseId, testCase) => {
        const profile = readReviewedProfile(set, testCase.cv);
        const recording = readReviewedRecording(set, caseId);
        if (!profile || !recording) return; // not recorded or not reviewed yet: skipped by design

        const runs = recording.plans.map((plan) => validatePlan(plan, profile));
        const chosen = runs.at(-1) ?? runs[0];
        const seeded = recording.plans.flatMap((plan) => seedFabrications(plan));
        const escaped = seeded.filter((fabrication) => {
          const run = validatePlan(fabrication.plan, profile);
          return !run.results.some((result) =>
            result.violations.some((violation) => violation.rule === fabrication.rule),
          );
        });
        const leaks =
          testCase.kind === "injection" && testCase.marker
            ? recording.plans.filter((plan) => JSON.stringify(plan).includes(testCase.marker ?? ""))
                .length + (JSON.stringify(recording.requirements).includes(testCase.marker) ? 1 : 0)
            : 0;

        metrics.push({
          caseId,
          verified: chosen?.summary.verified ?? 0,
          unverified: chosen?.summary.unverified ?? 0,
          skipped: chosen?.summary.skipped ?? 0,
          seededCaught: seeded.length - escaped.length,
          seededTotal: seeded.length,
          fabricatedVerified: escaped.length,
          injectionLeaks: leaks,
          durationsMs: recording.durationsMs,
          model: recording.model,
        });

        expect(escaped.map((fabrication) => fabrication.id)).toEqual([]);
        expect(leaks).toBe(0);
      },
    );

    it("builds injection variants that hide the marker in four ways", () => {
      const variants = buildInjectionVariants(
        "<html><body><h1>Ad</h1></body></html>",
        "ZEBRA-7731",
      );

      expect(variants.map((variant) => variant.kind)).toEqual([
        "css-hidden",
        "off-screen",
        "alt-text",
        "visible-instruction",
      ]);
      expect(variants.every((variant) => variant.html.includes("ZEBRA-7731"))).toBe(true);
    });
  },
);

describe("regression metrics", () => {
  it("totals fabricated facts and reports p95 only for Sonnet 5.5 recordings", () => {
    const base: CaseMetrics = {
      caseId: "c",
      verified: 1,
      unverified: 0,
      skipped: 0,
      seededCaught: 7,
      seededTotal: 7,
      fabricatedVerified: 0,
      injectionLeaks: 0,
      durationsMs: { requirements: 1000, tailoring: 20_000, total: 22_000 },
      model: "claude-sonnet-5-5",
    };

    const result = totals([base, { ...base, model: "synthetic" }]);

    expect(result).toMatchObject({ cases: 2, fabricatedVerified: 0, seededCaught: 14 });
    expect(result.p95).toEqual({ requirements: 1000, tailoring: 20_000, total: 22_000 });
  });
});
