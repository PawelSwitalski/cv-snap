import { collectProfileIds, type CvProfileContent } from "./cv-profile.js";
import type { TailoringPlan } from "./tailoring-plan.js";

export interface UnresolvedCitation {
  /** Location in the plan, e.g. `items[1].bullets[0]`. */
  path: string;
  /** The cited ID that doesn't exist in the profile. */
  id: string;
}

/**
 * Every plan citation (`profileId`, `sourceIds`) that doesn't resolve in the profile. Empty when
 * all resolve. Reused by the deterministic validator as its UNKNOWN_SOURCE rule (bolt 006).
 * Reports paths and IDs only, never text.
 */
export function unresolvedCitations(
  plan: TailoringPlan,
  profile: CvProfileContent,
): UnresolvedCitation[] {
  const known = new Set(collectProfileIds(profile));
  const missing: UnresolvedCitation[] = [];
  const check = (path: string, ids: string[]) => {
    for (const id of ids) if (!known.has(id)) missing.push({ path, id });
  };
  plan.summary.forEach((line, index) => {
    check(`summary[${String(index)}]`, line.sourceIds);
  });
  plan.items.forEach((item, index) => {
    check(`items[${String(index)}].profileId`, [item.profileId]);
    item.bullets.forEach((bullet, bulletIndex) => {
      check(`items[${String(index)}].bullets[${String(bulletIndex)}]`, bullet.sourceIds);
    });
  });
  plan.skills.forEach((skill, index) => {
    check(`skills[${String(index)}]`, skill.sourceIds);
  });
  return missing;
}
