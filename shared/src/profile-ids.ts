import type { Bullet, CvProfileContent, CvProfileExtraction } from "./cv-profile.js";
import { newId } from "./ids.js";

/** ID prefix per profile item kind (ddd-02). */
export const PROFILE_ID_PREFIXES = {
  summary: "sum",
  experience: "exp",
  project: "prj",
  education: "edu",
  skill: "skl",
  language: "lng",
  certification: "crt",
  other: "oth",
} as const;

/** Placeholders a model may write for a fact the CV doesn't state (PL/EN/DE). */
const PLACEHOLDERS = new Set([
  "unknown",
  "n/a",
  "na",
  "none",
  "not specified",
  "not stated",
  "-",
  "—",
  "brak",
  "nieznana",
  "nieznany",
  "nie podano",
  "unbekannt",
  "keine angabe",
]);

/** `null` for empty or placeholder values of optional facts, so they are never shown as text. */
export function placeholderToNull(value: string | null): string | null {
  if (value === null) return null;
  const trimmed = value.trim();
  return trimmed.length === 0 || PLACEHOLDERS.has(trimmed.toLowerCase()) ? null : trimmed;
}

/**
 * Turns Claude's ID-less extraction into profile content with unique IDs. Items get a random
 * prefixed ID; their bullets are `<itemId>_b<n>` (1-based). IDs are opaque: they never encode
 * content, so later text edits can't change them. Pure apart from `newId`'s randomness.
 */
export function assignProfileIds(extraction: CvProfileExtraction): CvProfileContent {
  const used = new Set<string>();
  const next = (prefix: string) => {
    const id = newId(prefix, used);
    used.add(id);
    return id;
  };
  const lines = (itemId: string, texts: string[]): Bullet[] =>
    texts.map((text, index) => {
      const id = `${itemId}_b${String(index + 1)}`;
      used.add(id);
      return { id, text };
    });
  const withId = <T extends { bullets: string[] }>(prefix: string, item: T) => {
    const id = next(prefix);
    return { ...item, id, bullets: lines(id, item.bullets) };
  };

  return {
    sourceLanguage: extraction.sourceLanguage,
    contact: extraction.contact,
    headline: extraction.headline,
    summary: extraction.summary.map((text) => ({ id: next(PROFILE_ID_PREFIXES.summary), text })),
    experience: extraction.experience.map((item) =>
      withId(PROFILE_ID_PREFIXES.experience, {
        ...item,
        company: placeholderToNull(item.company),
        location: placeholderToNull(item.location),
      }),
    ),
    projects: extraction.projects.map((item) =>
      withId(PROFILE_ID_PREFIXES.project, { ...item, role: placeholderToNull(item.role) }),
    ),
    education: extraction.education.map((item) =>
      withId(PROFILE_ID_PREFIXES.education, {
        ...item,
        degree: placeholderToNull(item.degree),
        field: placeholderToNull(item.field),
      }),
    ),
    skills: extraction.skills.map((skill) => ({ ...skill, id: next(PROFILE_ID_PREFIXES.skill) })),
    languages: extraction.languages.map((language) => ({
      ...language,
      id: next(PROFILE_ID_PREFIXES.language),
    })),
    certifications: extraction.certifications.map((certification) => ({
      ...certification,
      issuer: placeholderToNull(certification.issuer),
      id: next(PROFILE_ID_PREFIXES.certification),
    })),
    otherSections: extraction.otherSections.map((section) => {
      const id = next(PROFILE_ID_PREFIXES.other);
      return { ...section, id, items: lines(id, section.items) };
    }),
  };
}
