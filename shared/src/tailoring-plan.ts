import { z } from "zod";
import { IdSchema } from "./ids.js";
import { LanguageCodeSchema } from "./language.js";

/**
 * What the tailored CV will say (FR-10). Every line cites at least one profile ID in
 * `sourceIds`; the deterministic validator (story 006) checks those citations.
 */
const SourceIdsSchema = z.array(IdSchema).min(1);

export const PlanLineSchema = z.object({
  text: z.string().min(1),
  sourceIds: SourceIdsSchema,
});

export const PlanItemSchema = z.object({
  /** ID of the selected profile item (experience, project, education, …). */
  profileId: IdSchema,
  /** 1 = most relevant. Lowest-ranked items are dropped first to fit two pages (FR-14). */
  rank: z.number().int().min(1),
  bullets: z.array(PlanLineSchema),
});

export const PlanSkillSchema = z.object({
  name: z.string().min(1),
  sourceIds: SourceIdsSchema,
});

/** Requirement the user doesn't meet: shown to the user, never written into the CV. */
export const GapSchema = z.object({
  requirement: z.string().min(1),
  note: z.string().nullable(),
});

/**
 * Section headings in the output language. Built-in for PL/EN; Claude supplies them for other
 * languages (FR-12). Headings are labels, not facts, so the validator skips them.
 */
export const PlanHeadingsSchema = z.object({
  summary: z.string().nullable(),
  experience: z.string().nullable(),
  projects: z.string().nullable(),
  education: z.string().nullable(),
  skills: z.string().nullable(),
  languages: z.string().nullable(),
  certifications: z.string().nullable(),
});

export const TailoringPlanSchema = z.object({
  language: LanguageCodeSchema,
  summary: z.array(PlanLineSchema),
  items: z.array(PlanItemSchema),
  skills: z.array(PlanSkillSchema),
  headings: PlanHeadingsSchema,
  gaps: z.array(GapSchema),
});

export type PlanLine = z.infer<typeof PlanLineSchema>;
export type PlanItem = z.infer<typeof PlanItemSchema>;
export type PlanSkill = z.infer<typeof PlanSkillSchema>;
export type Gap = z.infer<typeof GapSchema>;
export type PlanHeadings = z.infer<typeof PlanHeadingsSchema>;
export type TailoringPlan = z.infer<typeof TailoringPlanSchema>;
