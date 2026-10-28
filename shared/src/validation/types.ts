import { z } from "zod";
import type { LanguageCode } from "../language.js";

/** Rules of the deterministic validator (story 006, ddd-02 decision 1). */
export const VALIDATION_RULES = [
  "UNKNOWN_SOURCE",
  "UNKNOWN_SKILL",
  "UNKNOWN_NUMBER",
  "UNKNOWN_DATE",
  "UNKNOWN_PERCENTAGE",
  "UNKNOWN_COMPANY",
  "UNKNOWN_TITLE",
] as const;

export const ValidationRuleSchema = z.enum(VALIDATION_RULES);

export type ValidationRule = z.infer<typeof ValidationRuleSchema>;

/**
 * Positional line ID (ddd-02 decision 2): `summary[i]`, `items[<profileId>].bullets[j]` or
 * `skills[k]`. Items are keyed by profile ID, so re-ranking items keeps bullet IDs; a profile ID
 * that appears twice in a plan gets `~2`, `~3`… on its later occurrences.
 */
export const LineIdSchema = z
  .string()
  .regex(/^(summary\[\d+\]|skills\[\d+\]|items\[[A-Za-z0-9_-]+(~\d+)?\]\.bullets\[\d+\])$/);

export type LineId = z.infer<typeof LineIdSchema>;

export type PlanLineKind = "summary" | "bullet" | "skill";

/** The offending token is normalised and short; never surrounding text (it goes into a prompt). */
export const MAX_TOKEN_CHARS = 80;

export interface Violation {
  rule: ValidationRule;
  lineId: LineId;
  token: string;
}

export type LineStatus = "verified" | "unverified" | "skipped";

export interface LineVerdict {
  lineId: LineId;
  kind: PlanLineKind;
  status: LineStatus;
  violations: Violation[];
}

/** One run of the validator over one plan; pure and deterministic. */
export interface ValidationRun {
  planLanguage: LanguageCode;
  results: LineVerdict[];
  summary: { verified: number; unverified: number; skipped: number };
  violationCount: number;
}

export interface ValidatePlanOptions {
  /** Lines the user edited in the preview: their own words, not validated (story 006). */
  userEditedLineIds?: readonly LineId[];
}
