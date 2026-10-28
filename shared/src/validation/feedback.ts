import type { ValidationRule, ValidationRun } from "./types.js";

/** At most this many feedback lines go to the retry (ddd-02). */
export const MAX_FEEDBACK_LINES = 30;

const WHAT: Record<ValidationRule, string> = {
  UNKNOWN_SOURCE: "cites an id that is not in the profile",
  UNKNOWN_SKILL: "skill",
  UNKNOWN_NUMBER: "number",
  UNKNOWN_DATE: "date",
  UNKNOWN_PERCENTAGE: "percentage",
  UNKNOWN_COMPANY: "company",
  UNKNOWN_TITLE: "job title",
};

/**
 * Validator feedback for the single retry (story 007): one short English line per violation, at
 * most 30, with only the rule, the line ID and the offending token. It goes into the prompt's
 * escaped `<validator_feedback>` data block, so no profile or ad text is repeated here.
 */
export function toFeedback(run: ValidationRun): string[] {
  const lines: string[] = [];
  for (const result of run.results) {
    for (const violation of result.violations) {
      if (lines.length >= MAX_FEEDBACK_LINES) return lines;
      lines.push(
        violation.rule === "UNKNOWN_SOURCE"
          ? `${violation.lineId}: ${WHAT.UNKNOWN_SOURCE} ("${violation.token}")`
          : `${violation.lineId}: ${WHAT[violation.rule]} "${violation.token}" is not in the cited sources`,
      );
    }
  }
  return lines;
}
