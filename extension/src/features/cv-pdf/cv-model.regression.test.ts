// @vitest-environment node
// The fixture repository reads files from `import.meta.url` paths, which happy-dom doesn't give.
import { describe, expect, it } from "vitest";
import {
  listFixtureSets,
  readReviewedProfile,
  readReviewedRecording,
} from "../../../../shared/test/regression/fixture-repository";
import { buildCvModel } from "./cv-model";

/**
 * Intent 003, story 003: on every recorded plan of every regression set (the committed synthetic
 * set and the git-ignored real sets, when present), the CV keeps every education entry and every
 * skill of the profile. `pnpm test:live` records new plans, so this also checks live runs.
 */
const cases = listFixtureSets().flatMap((set) =>
  set.manifest.cases.flatMap((testCase) => {
    const profile = readReviewedProfile(set, testCase.cv);
    const recording = readReviewedRecording(set, testCase.id);
    if (!profile || !recording) return [];
    return recording.plans.map(
      (plan, attempt) => [`${set.name}/${testCase.id}#${String(attempt)}`, profile, plan] as const,
    );
  }),
);

describe("CV model on recorded plans: complete education and skills", () => {
  it("has recorded plans to check (the committed synthetic set at least)", () => {
    expect(cases.length).toBeGreaterThan(0);
  });

  it.each(cases)("%s", (_name, profile, plan) => {
    const model = buildCvModel(profile, plan);
    const printed = (key: string) =>
      model.sections.filter((section) => section.key === key).flatMap((section) => section.entries);

    expect(printed("education").map((entry) => entry.id)).toEqual(
      expect.arrayContaining(profile.education.map((item) => item.id)),
    );
    expect(printed("education")).toHaveLength(profile.education.length);

    const skills = printed("skills").flatMap((entry) => entry.bullets);
    const names = new Set(skills.map((name) => name.trim().toLocaleLowerCase()));
    const cited = new Set(plan.skills.flatMap((skill) => skill.sourceIds));
    const missing = profile.skills.filter(
      (skill) => !cited.has(skill.id) && !names.has(skill.name.trim().toLocaleLowerCase()),
    );
    expect(missing.map((skill) => skill.name)).toEqual([]);
  });
});
