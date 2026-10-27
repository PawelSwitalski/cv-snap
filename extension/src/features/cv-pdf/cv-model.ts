import type {
  CvDate,
  CvProfile,
  EducationItem,
  ExperienceItem,
  LanguageCode,
  ProjectItem,
  TailoringPlan,
} from "@cv-snap/shared";
import { presentLabel, resolveHeadings, type SectionKey } from "./headings";

/**
 * Render-ready CV: what the PDF prints and the side-panel preview shows (FR-13 parity).
 * Built by a pure function, so the same profile + plan always give the same model.
 */
export interface CvEntry {
  /** Profile item id (stable; used by two-page fitting and to report dropped items). */
  id: string;
  /** Plan rank (1 = most relevant); null for entries that are never dropped. */
  rank: number | null;
  title: string | null;
  subtitle: string | null;
  dates: string | null;
  bullets: string[];
}

export type CvSectionLayout = "paragraph" | "entries" | "inline" | "list";

export interface CvSection {
  key: SectionKey;
  heading: string;
  layout: CvSectionLayout;
  entries: CvEntry[];
}

export interface CvHeader {
  fullName: string;
  headline: string | null;
  contactLines: string[];
  /** Photo as a data URL (from IndexedDB), or null: the header then reflows without a gap. */
  photoDataUrl: string | null;
}

export interface CvModel {
  language: LanguageCode;
  header: CvHeader;
  sections: CvSection[];
  /** GDPR clause, verbatim from settings, or null. */
  clause: string | null;
}

export interface BuildCvModelOptions {
  photoDataUrl?: string | null;
  clause?: string | null;
}

type RankedItemKind = "experience" | "projects" | "education";

/**
 * Joins the plan to the profile. Plan bullets are printed as written (unverified lines the user
 * kept print as normal text; markers are preview-only). Item sections appear in the order of
 * their most relevant item; plan items that don't match a profile item are skipped.
 */
export function buildCvModel(
  profile: CvProfile,
  plan: TailoringPlan,
  options: BuildCvModelOptions = {},
): CvModel {
  const language = plan.language;
  const headings = resolveHeadings(language, plan.headings);
  const sections: CvSection[] = [];

  const summary = plan.summary.map((line) => line.text);
  if (summary.length > 0) {
    sections.push({
      key: "summary",
      heading: headings.summary,
      layout: "paragraph",
      entries: [
        { id: "summary", rank: null, title: null, subtitle: null, dates: null, bullets: summary },
      ],
    });
  }

  const byKind = new Map<RankedItemKind, CvEntry[]>();
  const kindOrder: RankedItemKind[] = [];
  const seen = new Set<string>();
  for (const planItem of [...plan.items].sort((a, b) => a.rank - b.rank)) {
    // A profile item is printed once: a repeated plan item keeps only its best-ranked copy.
    if (seen.has(planItem.profileId)) continue;
    seen.add(planItem.profileId);
    const found = findItem(profile, planItem.profileId);
    if (!found) continue;
    const entry: CvEntry = {
      id: planItem.profileId,
      rank: planItem.rank,
      ...describeItem(found, language),
      bullets: planItem.bullets.map((bullet) => bullet.text),
    };
    if (!byKind.has(found.kind)) {
      byKind.set(found.kind, []);
      kindOrder.push(found.kind);
    }
    byKind.get(found.kind)?.push(entry);
  }
  for (const kind of kindOrder) {
    sections.push({
      key: kind,
      heading: headings[kind],
      layout: "entries",
      entries: byKind.get(kind) ?? [],
    });
  }

  const skills = plan.skills.map((skill) => skill.name);
  if (skills.length > 0) {
    sections.push({
      key: "skills",
      heading: headings.skills,
      layout: "inline",
      entries: [
        { id: "skills", rank: null, title: null, subtitle: null, dates: null, bullets: skills },
      ],
    });
  }

  const languages = profile.languages.map((item) =>
    item.level ? `${item.name} — ${item.level}` : item.name,
  );
  if (languages.length > 0) {
    sections.push({
      key: "languages",
      heading: headings.languages,
      layout: "list",
      entries: [
        {
          id: "languages",
          rank: null,
          title: null,
          subtitle: null,
          dates: null,
          bullets: languages,
        },
      ],
    });
  }

  const certifications = profile.certifications.map((item) =>
    [item.name, item.issuer, item.date ? formatDate(item.date) : null].filter(Boolean).join(", "),
  );
  if (certifications.length > 0) {
    sections.push({
      key: "certifications",
      heading: headings.certifications,
      layout: "list",
      entries: [
        {
          id: "certifications",
          rank: null,
          title: null,
          subtitle: null,
          dates: null,
          bullets: certifications,
        },
      ],
    });
  }

  const { contact } = profile;
  const contactLines = [
    contact.email,
    contact.phone,
    contact.location,
    ...contact.links.map((link) => link.url),
  ].filter((value): value is string => Boolean(value && value.trim()));

  return {
    language,
    header: {
      fullName: contact.fullName,
      headline: profile.headline,
      contactLines,
      photoDataUrl: options.photoDataUrl ?? null,
    },
    sections,
    clause: options.clause ?? null,
  };
}

type FoundItem =
  | { kind: "experience"; item: ExperienceItem }
  | { kind: "projects"; item: ProjectItem }
  | { kind: "education"; item: EducationItem };

function findItem(profile: CvProfile, id: string): FoundItem | null {
  const experience = profile.experience.find((item) => item.id === id);
  if (experience) return { kind: "experience", item: experience };
  const project = profile.projects.find((item) => item.id === id);
  if (project) return { kind: "projects", item: project };
  const education = profile.education.find((item) => item.id === id);
  if (education) return { kind: "education", item: education };
  return null;
}

function describeItem(
  found: FoundItem,
  language: LanguageCode,
): Pick<CvEntry, "title" | "subtitle" | "dates"> {
  const { item } = found;
  const dates = formatRange(item.startDate, item.endDate, item.isCurrent, language);
  switch (found.kind) {
    case "experience":
      return {
        title: found.item.title,
        subtitle: [found.item.company, found.item.location].filter(Boolean).join(", "),
        dates,
      };
    case "projects":
      return { title: found.item.name, subtitle: found.item.role, dates };
    case "education":
      return {
        title: found.item.institution,
        subtitle: [found.item.degree, found.item.field].filter(Boolean).join(", ") || null,
        dates,
      };
  }
}

/** Language-neutral numeric dates ("03/2021", or "2019" when only the year is known). */
export function formatDate(date: CvDate): string {
  return date.month === null
    ? String(date.year)
    : `${String(date.month).padStart(2, "0")}/${String(date.year)}`;
}

export function formatRange(
  start: CvDate | null,
  end: CvDate | null,
  isCurrent: boolean,
  language: LanguageCode,
): string | null {
  const from = start ? formatDate(start) : null;
  const to = isCurrent ? (presentLabel(language) ?? "") : end ? formatDate(end) : null;
  if (!from && !to) return null;
  if (!from) return to;
  if (to === null) return from;
  return to ? `${from} – ${to}` : `${from} –`;
}
