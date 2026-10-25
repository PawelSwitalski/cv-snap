import { z } from "zod";
import { findDuplicateIds, IdSchema } from "./ids.js";
import { LanguageCodeSchema } from "./language.js";

/**
 * CV profile: the user-reviewed, only source of facts (FR-4, FR-5).
 *
 * `CvProfileContentSchema` is what Claude returns from the extracted PDF text (it is also sent to
 * `claude --json-schema`, so it avoids constructs JSON Schema can't express). `CvProfileSchema` is
 * the persisted, versioned form. Facts the CV may not state are nullable, never invented.
 */

export const CV_PROFILE_SCHEMA_VERSION = 1;

/** Month precision is the most a CV usually gives; `month` is null when only the year is known. */
export const CvDateSchema = z.object({
  year: z.number().int().min(1900).max(2100),
  month: z.number().int().min(1).max(12).nullable(),
});

export const BulletSchema = z.object({
  id: IdSchema,
  text: z.string().min(1),
});

const datedFields = {
  startDate: CvDateSchema.nullable(),
  endDate: CvDateSchema.nullable(),
  isCurrent: z.boolean(),
};

export const ExperienceItemSchema = z.object({
  id: IdSchema,
  company: z.string().min(1),
  title: z.string().min(1),
  location: z.string().nullable(),
  ...datedFields,
  bullets: z.array(BulletSchema),
  skills: z.array(z.string().min(1)),
});

export const ProjectItemSchema = z.object({
  id: IdSchema,
  name: z.string().min(1),
  role: z.string().nullable(),
  url: z.string().nullable(),
  ...datedFields,
  bullets: z.array(BulletSchema),
  skills: z.array(z.string().min(1)),
});

export const EducationItemSchema = z.object({
  id: IdSchema,
  institution: z.string().min(1),
  degree: z.string().nullable(),
  field: z.string().nullable(),
  ...datedFields,
  bullets: z.array(BulletSchema),
});

export const SkillItemSchema = z.object({
  id: IdSchema,
  name: z.string().min(1),
  category: z.string().nullable(),
});

export const LanguageItemSchema = z.object({
  id: IdSchema,
  name: z.string().min(1),
  level: z.string().nullable(),
});

export const CertificationItemSchema = z.object({
  id: IdSchema,
  name: z.string().min(1),
  issuer: z.string().nullable(),
  date: CvDateSchema.nullable(),
});

export const OtherSectionSchema = z.object({
  id: IdSchema,
  title: z.string().min(1),
  items: z.array(BulletSchema),
});

export const ContactSchema = z.object({
  fullName: z.string().min(1),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  location: z.string().nullable(),
  links: z.array(z.object({ label: z.string(), url: z.string() })),
});

export const CvProfileContentSchema = z.object({
  sourceLanguage: LanguageCodeSchema,
  contact: ContactSchema,
  headline: z.string().nullable(),
  summary: z.array(BulletSchema),
  experience: z.array(ExperienceItemSchema),
  projects: z.array(ProjectItemSchema),
  education: z.array(EducationItemSchema),
  skills: z.array(SkillItemSchema),
  languages: z.array(LanguageItemSchema),
  certifications: z.array(CertificationItemSchema),
  otherSections: z.array(OtherSectionSchema),
});

export type CvDate = z.infer<typeof CvDateSchema>;
export type Bullet = z.infer<typeof BulletSchema>;
export type ExperienceItem = z.infer<typeof ExperienceItemSchema>;
export type ProjectItem = z.infer<typeof ProjectItemSchema>;
export type EducationItem = z.infer<typeof EducationItemSchema>;
export type SkillItem = z.infer<typeof SkillItemSchema>;
export type LanguageItem = z.infer<typeof LanguageItemSchema>;
export type CertificationItem = z.infer<typeof CertificationItemSchema>;
export type OtherSection = z.infer<typeof OtherSectionSchema>;
export type CvProfileContent = z.infer<typeof CvProfileContentSchema>;

/** Every item and bullet ID in the profile, in document order (duplicates included). */
export function collectProfileIds(content: CvProfileContent): string[] {
  const withBullets = (item: { id: string; bullets: Bullet[] }) => [
    item.id,
    ...item.bullets.map((bullet) => bullet.id),
  ];
  return [
    ...content.summary.map((bullet) => bullet.id),
    ...content.experience.flatMap(withBullets),
    ...content.projects.flatMap(withBullets),
    ...content.education.flatMap(withBullets),
    ...content.skills.map((skill) => skill.id),
    ...content.languages.map((language) => language.id),
    ...content.certifications.map((certification) => certification.id),
    ...content.otherSections.flatMap((section) => [
      section.id,
      ...section.items.map((item) => item.id),
    ]),
  ];
}

function rejectDuplicateIds(content: CvProfileContent, ctx: z.RefinementCtx): void {
  const duplicates = findDuplicateIds(collectProfileIds(content));
  if (duplicates.length > 0) {
    ctx.addIssue({ code: "custom", message: `duplicate ids: ${duplicates.join(", ")}` });
  }
}

/** Content as returned by Claude, plus the unique-ID rule (checked after parsing). */
export const ParsedCvProfileContentSchema = CvProfileContentSchema.superRefine(rejectDuplicateIds);

/** Persisted profile (chrome.storage.local, export). */
export const CvProfileSchema = CvProfileContentSchema.extend({
  schemaVersion: z.literal(CV_PROFILE_SCHEMA_VERSION),
  id: IdSchema,
  /** IndexedDB key of the optional photo (FR-5). */
  photoRef: z.string().nullable(),
  /** Set when the user confirms the profile; generation needs a confirmed profile. */
  confirmedAt: z.iso.datetime().nullable(),
  updatedAt: z.iso.datetime(),
}).superRefine(rejectDuplicateIds);

export type CvProfile = z.infer<typeof CvProfileSchema>;
