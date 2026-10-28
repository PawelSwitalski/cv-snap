import { describe, expect, it } from "vitest";
import { loadFixture } from "../../test/fixtures.js";
import { CvProfileSchema, type CvProfile } from "../cv-profile.js";
import { TailoringPlanSchema, type TailoringPlan } from "../tailoring-plan.js";
import { toFeedback } from "./feedback.js";
import { validatePlan } from "./validate-plan.js";

const profile = (): CvProfile => CvProfileSchema.parse(loadFixture("profile"));
const plan = (): TailoringPlan => TailoringPlanSchema.parse(loadFixture("plan"));

/** Replaces the first bullet's text (the line cites `exp_acme_b1`, item `exp_acme`). */
function withBullet(text: string): TailoringPlan {
  const result = plan();
  const bullet = result.items[0]?.bullets[0];
  if (!bullet) throw new Error("fixture changed");
  bullet.text = text;
  return result;
}

const rulesOf = (run: ReturnType<typeof validatePlan>) =>
  run.results.flatMap((result) => result.violations.map((violation) => violation.rule));

describe("validatePlan (Stage 4 smoke checks; full rule tests in Stage 5)", () => {
  it("verifies the synthetic plan built only from profile facts", () => {
    const run = validatePlan(plan(), profile());

    expect(run.violationCount).toBe(0);
    expect(run.summary.verified).toBe(run.results.length);
    expect(run.results.map((result) => result.lineId)).toEqual([
      "summary[0]",
      "items[exp_acme].bullets[0]",
      "skills[0]",
      "skills[1]",
    ]);
  });

  it.each([
    ["Skrócenie czasu ładowania o 75% w Haskell.", ["UNKNOWN_PERCENTAGE", "UNKNOWN_SKILL"]],
    ["Migracja 12 aplikacji do TypeScript.", ["UNKNOWN_NUMBER"]],
    ["Migracja do TypeScript w 2015.", ["UNKNOWN_DATE"]],
    ["Migracja do TypeScript w Globex Corp.", ["UNKNOWN_COMPANY"]],
    ["Pracował jako Chief Executive Officer.", ["UNKNOWN_TITLE"]],
  ])("flags a fabricated fact in %j", (text, rules) => {
    expect(rulesOf(validatePlan(withBullet(text), profile()))).toEqual(rules);
  });

  it("accepts facts of the bullet's own item, cited bullets and inflected company names", () => {
    const cited = withBullet(
      "Od marca 2021 w Acme: migracja do TypeScript, czas ładowania krótszy o 40%.",
    );
    const bullet = cited.items[0]?.bullets[0];
    if (bullet) bullet.sourceIds = ["exp_acme_b1", "exp_acme_b2"];

    expect(rulesOf(validatePlan(cited, profile()))).toEqual([]);
  });

  it("flags a percentage from a bullet the line doesn't cite", () => {
    const run = validatePlan(withBullet("Czas ładowania krótszy o 40%."), profile());

    expect(rulesOf(run)).toEqual(["UNKNOWN_PERCENTAGE"]);
  });

  it("flags an unknown citation and skips the other rules for that line", () => {
    const broken = withBullet("Migracja 99 aplikacji.");
    const bullet = broken.items[0]?.bullets[0];
    if (bullet) bullet.sourceIds = ["nope"];

    expect(rulesOf(validatePlan(broken, profile()))).toEqual(["UNKNOWN_SOURCE"]);
  });

  it("skips user-edited lines and leaves out removed ones", () => {
    const run = validatePlan(withBullet("Migracja 12 aplikacji."), profile(), {
      userEditedLineIds: ["items[exp_acme].bullets[0]"],
      removedLineIds: ["skills[1]"],
    });

    expect(run.summary).toEqual({ verified: 2, unverified: 0, skipped: 1 });
  });

  it("writes short data-only feedback lines", () => {
    const feedback = toFeedback(validatePlan(withBullet("Migracja 12 aplikacji."), profile()));

    expect(feedback).toEqual([
      'items[exp_acme].bullets[0]: number "12" is not in the cited sources',
    ]);
  });
});
