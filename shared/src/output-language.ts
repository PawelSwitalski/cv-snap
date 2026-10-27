import type { JobRequirements } from "./job-requirements.js";
import type { LanguageCode } from "./language.js";

export interface OutputLanguage {
  code: LanguageCode;
  /** Why this language: the user's per-generation override, the ad, or the profile fallback. */
  source: "override" | "ad" | "profile";
}

/**
 * Output language policy (FR-12, ddd-01): the override wins; otherwise the ad's language; if the
 * ad's language was undecidable (`null`), the profile's own language (user decision 2026-10-25).
 */
export function decideOutputLanguage(
  requirements: Pick<JobRequirements, "language">,
  override: LanguageCode | null,
  profileSourceLanguage: LanguageCode,
): OutputLanguage {
  if (override) return { code: override, source: "override" };
  if (requirements.language) return { code: requirements.language, source: "ad" };
  return { code: profileSourceLanguage, source: "profile" };
}

/** English name of a language for prompts ("German"), or the code when the runtime lacks it. */
export function languageName(code: LanguageCode): string {
  try {
    return new Intl.DisplayNames(["en"], { type: "language" }).of(code) ?? code;
  } catch {
    return code;
  }
}
