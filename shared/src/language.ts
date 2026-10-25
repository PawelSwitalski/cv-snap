import { z } from "zod";

/** ISO 639-1 language code ("pl", "en", "de", …). Any language is allowed (FR-12). */
export const LanguageCodeSchema = z
  .string()
  .regex(/^[a-z]{2}$/, "must be a two-letter ISO 639-1 code, e.g. 'pl' or 'en'");

export type LanguageCode = z.infer<typeof LanguageCodeSchema>;
