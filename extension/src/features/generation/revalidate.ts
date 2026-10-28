import {
  validatePlan,
  type CvProfileContent,
  type LineId,
  type ValidationRun,
} from "@cv-snap/shared";
import type { GenerationResult } from "./generation-result";

export interface UserChanges {
  /** Lines whose text the user changed: their own words, not validated (story 006). */
  userEditedLineIds: readonly LineId[];
  /** Lines the user removed from the CV. */
  removedLineIds: readonly LineId[];
}

/**
 * Verdicts after the user edited or removed lines in the preview (FR-11, FR-13), without calling
 * Claude: edited lines become `skipped`, removed lines leave the result. Line IDs keep referring to
 * the generated plan.
 */
export function revalidate(
  result: Pick<GenerationResult, "plan">,
  profile: CvProfileContent,
  changes: UserChanges,
): ValidationRun {
  return validatePlan(result.plan, profile, {
    userEditedLineIds: changes.userEditedLineIds,
    removedLineIds: changes.removedLineIds,
  });
}
