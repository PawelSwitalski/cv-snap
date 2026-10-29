import { z } from "zod";
import { findDuplicateIds, IdSchema } from "./ids.js";
import { LanguageCodeSchema } from "./language.js";
import { LIMITS, LineTextSchema, OptionalShortTextSchema, ShortTextSchema } from "./limits.js";

/**
 * CV profile: the user-reviewed, only source of facts (FR-4, FR-5).
 *
 * `CvProfileExtractionSchema` is what Claude returns from the extracted PDF text: the same content
 * **without IDs**, because IDs are assigned by code (`assignProfileIds`), never invented by the
 * model. `CvProfileContentSchema` is that content with IDs; `CvProfileSchema` is the persisted,
 * versioned form. Facts the CV may not state are nullable, never invented.
 */

export const CV_PROFILE_SCHEMA_VERSION = 1;

/** Month precision is the most a CV usually gives; `month` is null when only the year is known. */
export const CvDateSchema = z.object({
  year: z.number().int().min(1900).max(2100),
  month: z.number().int().min(1).max(12).nullable(),
});

export const BulletSchema = z.object({
  id: IdSchema,
  text: LineTextSchema,
});

const bullets = z.array(BulletSchema).max(LIMITS.bullets);
const skillNames = z.array(ShortTextSchema).max(LIMITS.listItems);

const datedFields = {
  startDate: CvDateSchema.nullable(),
  endDate: CvDateSchema.nullable(),
  isCurrent: z.boolean(),
};

export const ExperienceItemSchema = z.object({
  id: IdSchema,
  /** Null when the CV doesn't name the employer (freelance, confidential client, anonymised CV). */
  company: OptionalShortTextSchema,
  title: ShortTextSchema,
  location: OptionalShortTextSchema,
  ...datedFields,
  bullets,
  skills: skillNames,
});

export const ProjectItemSchema = z.object({
  id: IdSchema,
  name: ShortTextSchema,
  role: OptionalShortTextSchema,
  url: OptionalShortTextSchema,
  ...datedFields,
  bullets,
  skills: skillNames,
});

export const EducationItemSchema = z.object({
  id: IdSchema,
  institution: ShortTextSchema,
  degree: OptionalShortTextSchema,
  field: OptionalShortTextSchema,
  ...datedFields,
  bullets,
});

export const SkillItemSchema = z.object({
  id: IdSchema,
  name: ShortTextSchema,
  category: OptionalShortTextSchema,
});

export const LanguageItemSchema = z.object({
  id: IdSchema,
  name: ShortTextSchema,
  level: OptionalShortTextSchema,
});

export const CertificationItemSchema = z.object({
  id: IdSchema,
  name: ShortTextSchema,
  issuer: OptionalShortTextSchema,
  date: CvDateSchema.nullable(),
});

export const OtherSectionSchema = z.object({
  id: IdSchema,
  title: ShortTextSchema,
  items: bullets,
});

export const ContactSchema = z.object({
  fullName: ShortTextSchema,
  email: OptionalShortTextSchema,
  phone: OptionalShortTextSchema,
  location: OptionalShortTextSchema,
  links: z
    .array(
      z.object({
        label: z.string().max(LIMITS.shortChars),
        url: z.string().max(LIMITS.shortChars),
      }),
    )
    .max(LIMITS.sectionItems),
});

const section = <T extends z.ZodType>(item: T) => z.array(item).max(LIMITS.sectionItems);

export const CvProfileContentSchema = z.object({
  sourceLanguage: LanguageCodeSchema,
  contact: ContactSchema,
  headline: OptionalShortTextSchema,
  summary: z.array(BulletSchema).max(LIMITS.bullets),
  experience: section(ExperienceItemSchema),
  projects: section(ProjectItemSchema),
  education: section(EducationItemSchema),
  skills: z.array(SkillItemSchema).max(LIMITS.listItems),
  languages: section(LanguageItemSchema),
  certifications: section(CertificationItemSchema),
  otherSections: section(OtherSectionSchema),
});

/** Bullets as plain lines: the model writes text only, code assigns the IDs. */
const extractedLines = z.array(LineTextSchema).max(LIMITS.bullets);

/** What Claude returns for a CV: the profile content without any `id` (story 003, ddd-02). */
export const CvProfileExtractionSchema = z.object({
  sourceLanguage: LanguageCodeSchema,
  contact: ContactSchema,
  headline: OptionalShortTextSchema,
  summary: extractedLines,
  experience: section(ExperienceItemSchema.omit({ id: true }).extend({ bullets: extractedLines })),
  projects: section(ProjectItemSchema.omit({ id: true }).extend({ bullets: extractedLines })),
  education: section(EducationItemSchema.omit({ id: true }).extend({ bullets: extractedLines })),
  skills: z.array(SkillItemSchema.omit({ id: true })).max(LIMITS.listItems),
  languages: section(LanguageItemSchema.omit({ id: true })),
  certifications: section(CertificationItemSchema.omit({ id: true })),
  otherSections: section(OtherSectionSchema.omit({ id: true }).extend({ items: extractedLines })),
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
export type CvProfileExtraction = z.infer<typeof CvProfileExtractionSchema>;

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

/** Content with IDs plus the unique-ID rule (checked after parsing). */
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
