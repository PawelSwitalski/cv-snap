import { z } from "zod";
import { IdSchema } from "./ids.js";
import { LanguageCodeSchema } from "./language.js";
import { LIMITS, LineTextSchema, ShortTextSchema } from "./limits.js";

/**
 * What the tailored CV will say (FR-10). Every line cites at least one profile ID in
 * `sourceIds`; the deterministic validator (story 006) checks those citations.
 */
const SourceIdsSchema = z.array(IdSchema).min(1).max(LIMITS.sectionItems);

export const PlanLineSchema = z.object({
  text: LineTextSchema,
  sourceIds: SourceIdsSchema,
});

export const PlanItemSchema = z.object({
  /** ID of the selected profile item (experience, project, education, …). */
  profileId: IdSchema,
  /** 1 = most relevant. Lowest-ranked items are dropped first to fit two pages (FR-14). */
  rank: z.number().int().min(1),
  bullets: z.array(PlanLineSchema).max(LIMITS.bullets),
});

export const PlanSkillSchema = z.object({
  name: ShortTextSchema,
  sourceIds: SourceIdsSchema,
});

/** Requirement the user doesn't meet: shown to the user, never written into the CV. */
export const GapSchema = z.object({
  requirement: LineTextSchema,
  note: z.string().max(LIMITS.lineChars).nullable(),
});

/**
 * Section headings in the output language. Built-in for PL/EN; Claude supplies them for other
 * languages (FR-12). Headings are labels, not facts, so the validator skips them.
 */
export const PlanHeadingsSchema = z.object({
  summary: z.string().max(LIMITS.shortChars).nullable(),
  experience: z.string().max(LIMITS.shortChars).nullable(),
  projects: z.string().max(LIMITS.shortChars).nullable(),
  education: z.string().max(LIMITS.shortChars).nullable(),
  skills: z.string().max(LIMITS.shortChars).nullable(),
  languages: z.string().max(LIMITS.shortChars).nullable(),
  certifications: z.string().max(LIMITS.shortChars).nullable(),
});

export const TailoringPlanSchema = z.object({
  language: LanguageCodeSchema,
  summary: z.array(PlanLineSchema).max(LIMITS.bullets),
  items: z.array(PlanItemSchema).max(LIMITS.sectionItems),
  skills: z.array(PlanSkillSchema).max(LIMITS.listItems),
  headings: PlanHeadingsSchema,
  gaps: z.array(GapSchema).max(LIMITS.sectionItems),
});

export type PlanLine = z.infer<typeof PlanLineSchema>;
export type PlanItem = z.infer<typeof PlanItemSchema>;
export type PlanSkill = z.infer<typeof PlanSkillSchema>;
export type Gap = z.infer<typeof GapSchema>;
export type PlanHeadings = z.infer<typeof PlanHeadingsSchema>;
export type TailoringPlan = z.infer<typeof TailoringPlanSchema>;
