import { DEFAULT_MODEL, LIMITS, ModelIdSchema, type ModelId } from "@cv-snap/shared";
import { z } from "zod";
import {
  DEFAULT_GDPR_CLAUSE_SETTINGS,
  type GdprClauseMode,
  type GdprClauseSettings,
} from "@/features/cv-pdf/gdpr-clause";

/**
 * User settings (story 008). The UI language is kept by the i18n provider (bolt 010) under its own
 * key; allowed sites are Chrome's granted permissions (bolt 007). Everything else lives here.
 */
export interface Settings {
  /** Claude model for every call: profile creation, requirements, tailoring (FR-20). */
  model: ModelId;
  gdprClause: GdprClauseSettings;
  /** How long the history keeps a CV (story 004-retention-setting). */
  historyRetention: HistoryRetention;
}

/** Keep every history entry, or delete it N calendar months after its last download. */
export type HistoryRetention = { mode: "forever" } | { mode: "months"; months: number };

export const MIN_RETENTION_MONTHS = 1;
export const MAX_RETENTION_MONTHS = 24;

export const HistoryRetentionSchema = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("forever") }),
  z.object({
    mode: z.literal("months"),
    months: z.number().int().min(MIN_RETENTION_MONTHS).max(MAX_RETENTION_MONTHS),
  }),
]);

export const DEFAULT_SETTINGS: Settings = {
  model: DEFAULT_MODEL,
  gdprClause: DEFAULT_GDPR_CLAUSE_SETTINGS,
  historyRetention: { mode: "forever" },
};

export const GDPR_CLAUSE_MODES: readonly GdprClauseMode[] = ["polishAdsOnly", "always", "never"];

/** Long enough for any real consent clause; the PDF prints it verbatim. */
export const MAX_CLAUSE_CHARS = LIMITS.lineChars * 4;

const GdprClauseSchema = z.object({
  mode: z.enum(["polishAdsOnly", "always", "never"]),
  textPl: z.string().max(MAX_CLAUSE_CHARS),
  textEn: z.string().max(MAX_CLAUSE_CHARS),
});

/**
 * Reads stored settings field by field: a value that is missing or no longer valid (e.g. a model
 * that a newer version removed) falls back to its default without resetting the others.
 */
export function parseSettings(stored: {
  model: unknown;
  gdprClause: unknown;
  historyRetention?: unknown;
}): Settings {
  const model = ModelIdSchema.safeParse(stored.model);
  const gdprClause = GdprClauseSchema.safeParse(stored.gdprClause);
  const historyRetention = HistoryRetentionSchema.safeParse(stored.historyRetention);
  return {
    model: model.success ? model.data : DEFAULT_SETTINGS.model,
    gdprClause: gdprClause.success ? gdprClause.data : DEFAULT_SETTINGS.gdprClause,
    historyRetention: historyRetention.success
      ? historyRetention.data
      : DEFAULT_SETTINGS.historyRetention,
  };
}

export function isGdprClauseValid(value: GdprClauseSettings): boolean {
  return GdprClauseSchema.safeParse(value).success;
}
