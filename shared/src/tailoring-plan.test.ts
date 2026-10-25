import { describe, expect, it } from "vitest";
import { loadFixture } from "../test/fixtures.js";
import { parseWithReadableError } from "./parse.js";
import { TailoringPlanSchema, type TailoringPlan } from "./tailoring-plan.js";

function validPlan(): TailoringPlan {
  return TailoringPlanSchema.parse(loadFixture("plan"));
}

describe("TailoringPlanSchema", () => {
  it("parses the valid fixture", () => {
    expect(TailoringPlanSchema.safeParse(loadFixture("plan")).success).toBe(true);
  });

  it("rejects a bullet without sourceIds, naming the path", () => {
    const plan = validPlan();
    const bullet = plan.items[0]?.bullets[0];
    if (!bullet) throw new Error("fixture changed");
    bullet.sourceIds = [];

    const result = parseWithReadableError(TailoringPlanSchema, plan);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toContain("items[0].bullets[0].sourceIds");
  });

  it("rejects a summary line without sourceIds", () => {
    const plan = validPlan();
    const line = plan.summary[0];
    if (!line) throw new Error("fixture changed");
    line.sourceIds = [];

    expect(TailoringPlanSchema.safeParse(plan).success).toBe(false);
  });

  it("rejects a skill without sourceIds", () => {
    const plan = validPlan();
    const skill = plan.skills[0];
    if (!skill) throw new Error("fixture changed");
    skill.sourceIds = [];

    expect(TailoringPlanSchema.safeParse(plan).success).toBe(false);
  });

  it("rejects a rank below 1 and a non-integer rank", () => {
    const zero = validPlan();
    const fraction = validPlan();
    const zeroItem = zero.items[0];
    const fractionItem = fraction.items[0];
    if (!zeroItem || !fractionItem) throw new Error("fixture changed");
    zeroItem.rank = 0;
    fractionItem.rank = 1.5;

    expect(TailoringPlanSchema.safeParse(zero).success).toBe(false);
    expect(TailoringPlanSchema.safeParse(fraction).success).toBe(false);
  });

  it("accepts headings supplied for a language without built-in labels", () => {
    const plan = validPlan();
    plan.language = "de";
    plan.headings.experience = "Berufserfahrung";

    expect(TailoringPlanSchema.safeParse(plan).success).toBe(true);
  });
});
