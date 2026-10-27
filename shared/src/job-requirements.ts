import { z } from "zod";
import { LanguageCodeSchema } from "./language.js";
import { LIMITS, LineTextSchema, OptionalShortTextSchema, ShortTextSchema } from "./limits.js";

/**
 * Structured view of a job ad (FR-9), returned by Claude. Facts the ad may not state are
 * nullable or "unknown": a required field forces the model to invent a value (spike 001).
 */
export const SENIORITY_LEVELS = ["intern", "junior", "mid", "senior", "lead", "unknown"] as const;

const requirementList = z.array(LineTextSchema).max(LIMITS.listItems);

export const JobRequirementsSchema = z.object({
  title: ShortTextSchema,
  company: OptionalShortTextSchema,
  location: OptionalShortTextSchema,
  seniority: z.enum(SENIORITY_LEVELS),
  mustHaves: requirementList,
  niceToHaves: requirementList,
  keywords: z.array(ShortTextSchema).max(LIMITS.listItems),
  /**
   * Language of the ad's body text (ad-language rule, ddd-01). `null` when undecidable: the output
   * language then falls back to the profile's language (`decideOutputLanguage`).
   */
  language: LanguageCodeSchema.nullable(),
});

export type JobRequirements = z.infer<typeof JobRequirementsSchema>;

/** Max characters of a JSON-LD description passed along with the ad (ddd-02). */
export const MAX_STRUCTURED_DESCRIPTION_CHARS = 15_000;

/**
 * Fields from the page's schema.org `JobPosting` JSON-LD, when present (FR-7). Untrusted page data
 * like the ad text itself.
 */
export const StructuredAdFieldsSchema = z.object({
  title: OptionalShortTextSchema,
  company: OptionalShortTextSchema,
  description: z.string().max(MAX_STRUCTURED_DESCRIPTION_CHARS).nullable(),
});

export type StructuredAdFields = z.infer<typeof StructuredAdFieldsSchema>;
