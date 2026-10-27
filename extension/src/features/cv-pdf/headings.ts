import type { LanguageCode, PlanHeadings } from "@cv-snap/shared";

/** CV sections that carry a heading. Headings are labels, not facts (FR-12). */
export type SectionKey = keyof PlanHeadings;

export type SectionHeadings = Record<SectionKey, string>;

/** Built-in headings for the two UI languages; other languages use the plan's headings. */
export const BUILT_IN_HEADINGS: Record<"pl" | "en", SectionHeadings> = {
  pl: {
    summary: "Podsumowanie",
    experience: "Doświadczenie zawodowe",
    projects: "Projekty",
    education: "Wykształcenie",
    skills: "Umiejętności",
    languages: "Języki",
    certifications: "Certyfikaty",
  },
  en: {
    summary: "Summary",
    experience: "Experience",
    projects: "Projects",
    education: "Education",
    skills: "Skills",
    languages: "Languages",
    certifications: "Certifications",
  },
};

/** Word for an ongoing period ("03/2021 – present"); other languages get an open range. */
const PRESENT: Partial<Record<LanguageCode, string>> = { pl: "obecnie", en: "present" };

export function presentLabel(language: LanguageCode): string | null {
  return PRESENT[language] ?? null;
}

/**
 * Headings for the output language: built-in for PL/EN; otherwise the plan's headings (supplied by
 * Claude for that language), falling back to English for any heading the plan leaves out.
 */
export function resolveHeadings(
  language: LanguageCode,
  planHeadings: PlanHeadings,
): SectionHeadings {
  if (language === "pl" || language === "en") return BUILT_IN_HEADINGS[language];
  const english = BUILT_IN_HEADINGS.en;
  const keys = Object.keys(english) as SectionKey[];
  return Object.fromEntries(
    keys.map((key) => [key, planHeadings[key]?.trim() || english[key]]),
  ) as SectionHeadings;
}
