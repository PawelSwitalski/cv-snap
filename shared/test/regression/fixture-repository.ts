import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { CvProfileSchema } from "../../src/cv-profile.js";
import { JobRequirementsSchema } from "../../src/job-requirements.js";
import { TailoringPlanSchema } from "../../src/tailoring-plan.js";

/**
 * Regression fixture sets (story 008, ddd-02 "Data Model"). Each set is a directory under
 * `shared/test/fixtures/regression/` with a `manifest.json`: `synthetic/` now, the author's real
 * set (`real/`) at Stage 5. Every file is checked by the privacy check before it can be committed.
 */
export const REGRESSION_ROOT = new URL("../fixtures/regression/", import.meta.url);

export const ManifestSchema = z.object({
  schemaVersion: z.literal(1),
  cvs: z.array(
    z.object({
      id: z.string(),
      file: z.string(),
      language: z.string(),
      layout: z.enum(["one-column", "two-column"]),
      notes: z.string().optional(),
    }),
  ),
  ads: z.array(
    z.object({
      id: z.string(),
      file: z.string(),
      url: z.string(),
      board: z.string(),
      language: z.string(),
      expectation: z.enum(["match", "gaps-expected"]),
    }),
  ),
  cases: z.array(
    z.object({
      id: z.string(),
      cv: z.string(),
      ad: z.string(),
      kind: z.enum(["normal", "injection"]),
      /** Injection cases: the unique marker that must never appear in any output. */
      marker: z.string().optional(),
    }),
  ),
});

export type Manifest = z.infer<typeof ManifestSchema>;

/** The confirmed profile recorded for one CV; used only once the user has reviewed it. */
export const RecordedProfileSchema = z.object({
  reviewedAt: z.iso.datetime().nullable(),
  profile: CvProfileSchema,
});

/**
 * Claude's outputs for one case (live mode). Recorded mode uses a recording only when `reviewedAt`
 * is set: recordings are never accepted automatically (ddd-01 decision 5).
 */
export const RecordingSchema = z.object({
  caseId: z.string(),
  model: z.string(),
  claudeCodeVersion: z.string(),
  recordedAt: z.iso.datetime(),
  reviewedAt: z.iso.datetime().nullable(),
  requirements: JobRequirementsSchema,
  plans: z.array(TailoringPlanSchema).min(1).max(2),
  durationsMs: z.object({
    profile: z.number().nonnegative().nullable(),
    requirements: z.number().nonnegative(),
    tailoring: z.number().nonnegative(),
    total: z.number().nonnegative(),
  }),
});

export type Recording = z.infer<typeof RecordingSchema>;

export interface FixtureSet {
  name: string;
  dir: URL;
  manifest: Manifest;
}

/** Every fixture set (a directory with a manifest) under the regression root. */
export function listFixtureSets(root: URL = REGRESSION_ROOT): FixtureSet[] {
  if (!existsSync(root)) return [];
  return readdirSync(root, { withFileTypes: true })
    .filter(
      (entry) => entry.isDirectory() && existsSync(new URL(`${entry.name}/manifest.json`, root)),
    )
    .map((entry) => {
      const dir = new URL(`${entry.name}/`, root);
      const manifest = ManifestSchema.parse(
        JSON.parse(readFileSync(new URL("manifest.json", dir), "utf8")),
      );
      return { name: entry.name, dir, manifest };
    });
}

/** The reviewed profile of a CV, or null when not recorded or not reviewed yet. */
export function readReviewedProfile(set: FixtureSet, cvId: string) {
  const file = new URL(`cvs/${cvId}.profile.json`, set.dir);
  if (!existsSync(file)) return null;
  const recorded = RecordedProfileSchema.parse(JSON.parse(readFileSync(file, "utf8")));
  return recorded.reviewedAt === null ? null : recorded.profile;
}

/** The reviewed recording of a case, or null when missing or not reviewed yet. */
export function readReviewedRecording(set: FixtureSet, caseId: string): Recording | null {
  const file = new URL(`recordings/${caseId}.json`, set.dir);
  if (!existsSync(file)) return null;
  const recording = RecordingSchema.parse(JSON.parse(readFileSync(file, "utf8")));
  return recording.reviewedAt === null ? null : recording;
}

/** Every file of a set, recursively (for the privacy check). */
export function listFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? listFiles(join(dir, entry.name)) : [join(dir, entry.name)],
  );
}
