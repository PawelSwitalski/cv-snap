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
    experience: extraction.experience.map((item) => withId(PROFILE_ID_PREFIXES.experience, item)),
    projects: extraction.projects.map((item) => withId(PROFILE_ID_PREFIXES.project, item)),
    education: extraction.education.map((item) => withId(PROFILE_ID_PREFIXES.education, item)),
    skills: extraction.skills.map((skill) => ({ ...skill, id: next(PROFILE_ID_PREFIXES.skill) })),
    languages: extraction.languages.map((language) => ({
      ...language,
      id: next(PROFILE_ID_PREFIXES.language),
    })),
    certifications: extraction.certifications.map((certification) => ({
      ...certification,
      id: next(PROFILE_ID_PREFIXES.certification),
    })),
    otherSections: extraction.otherSections.map((section) => {
      const id = next(PROFILE_ID_PREFIXES.other);
      return { ...section, id, items: lines(id, section.items) };
    }),
  };
}
