import { z } from "zod";
import { LanguageCodeSchema } from "./language.js";

/**
 * Structured view of a job ad (FR-9), returned by Claude. Facts the ad may not state are
 * nullable or "unknown": a required field forces the model to invent a value (spike 001).
 */
export const SENIORITY_LEVELS = ["intern", "junior", "mid", "senior", "lead", "unknown"] as const;

export const JobRequirementsSchema = z.object({
  title: z.string().min(1),
  company: z.string().nullable(),
  location: z.string().nullable(),
  seniority: z.enum(SENIORITY_LEVELS),
  mustHaves: z.array(z.string().min(1)),
  niceToHaves: z.array(z.string().min(1)),
  keywords: z.array(z.string().min(1)),
  /** Language the ad is written in; the CV is generated in this language by default (FR-12). */
  language: LanguageCodeSchema,
});

export type JobRequirements = z.infer<typeof JobRequirementsSchema>;
