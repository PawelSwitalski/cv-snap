import type { TailoringPlan } from "../../src/tailoring-plan.js";
import type { ValidationRule } from "../../src/validation/types.js";

/** One deliberately fabricated plan and the rule that must catch it (ddd-01 SeededFabricator). */
export interface SeededFabrication {
  id: string;
  rule: ValidationRule;
  plan: TailoringPlan;
}

/** Fake facts no fixture profile contains; each one is appended to a single line. */
const MUTATIONS: readonly { rule: ValidationRule; suffix: string }[] = [
  { rule: "UNKNOWN_SKILL", suffix: " (Haskell)" },
  { rule: "UNKNOWN_NUMBER", suffix: " (9137 users)" },
  { rule: "UNKNOWN_PERCENTAGE", suffix: " (+73%)" },
  { rule: "UNKNOWN_DATE", suffix: " (1987)" },
  { rule: "UNKNOWN_COMPANY", suffix: " (Globex Ltd)" },
  { rule: "UNKNOWN_TITLE", suffix: " as Chief Executive Officer" },
];

/**
 * Deterministic mutations of a valid plan, one fake fact each (story 008: "every seeded
 * fabrication is caught"). The target is the first bullet, else the first summary line. Also: a
 * line citing an ID that doesn't exist.
 */
export function seedFabrications(plan: TailoringPlan): SeededFabrication[] {
  const target = (copy: TailoringPlan) =>
    copy.items.find((item) => item.bullets.length > 0)?.bullets[0] ?? copy.summary[0];
  if (!target(plan)) return [];
  const seeded: SeededFabrication[] = MUTATIONS.map(({ rule, suffix }) => {
    const copy = structuredClone(plan);
    const line = target(copy);
    if (line) line.text = `${line.text.replace(/[.\s]+$/, "")}${suffix}.`;
    return { id: `seed-${rule.toLowerCase()}`, rule, plan: copy };
  });
  const uncited = structuredClone(plan);
  const line = target(uncited);
  if (line) line.sourceIds = ["fabricated-source-id"];
  seeded.push({ id: "seed-unknown_source", rule: "UNKNOWN_SOURCE", plan: uncited });
  return seeded;
}
