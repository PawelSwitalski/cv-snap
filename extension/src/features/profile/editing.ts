import {
  collectProfileIds,
  newId,
  PROFILE_ID_PREFIXES,
  type Bullet,
  type CvProfileContent,
} from "@cv-snap/shared";

/**
 * Pure profile edits (story 004). Existing IDs never change; anything added gets a new ID that is
 * unique in the whole profile (`newId`). Every function returns a new profile object.
 */

/** Profile parts that are lists of items with IDs. */
export type ListSection =
  | "summary"
  | "experience"
  | "projects"
  | "education"
  | "skills"
  | "languages"
  | "certifications"
  | "otherSections";

/** Items that own lines: `bullets` for jobs/projects/education, `items` for other sections. */
export type LineSection = "experience" | "projects" | "education" | "otherSections";

type Item<S extends ListSection> = CvProfileContent[S][number];

const ID_PREFIX: Record<ListSection, string> = {
  summary: PROFILE_ID_PREFIXES.summary,
  experience: PROFILE_ID_PREFIXES.experience,
  projects: PROFILE_ID_PREFIXES.project,
  education: PROFILE_ID_PREFIXES.education,
  skills: PROFILE_ID_PREFIXES.skill,
  languages: PROFILE_ID_PREFIXES.language,
  certifications: PROFILE_ID_PREFIXES.certification,
  otherSections: PROFILE_ID_PREFIXES.other,
};

const undated = { startDate: null, endDate: null, isCurrent: false };

function blankItem(section: ListSection, id: string): Item<ListSection> {
  switch (section) {
    case "summary":
      return { id, text: "" };
    case "experience":
      return { id, company: null, title: "", location: null, ...undated, bullets: [], skills: [] };
    case "projects":
      return { id, name: "", role: null, url: null, ...undated, bullets: [], skills: [] };
    case "education":
      return { id, institution: "", degree: null, field: null, ...undated, bullets: [] };
    case "skills":
      return { id, name: "", category: null };
    case "languages":
      return { id, name: "", level: null };
    case "certifications":
      return { id, name: "", issuer: null, date: null };
    case "otherSections":
      return { id, title: "", items: [] };
  }
}

function freshId(profile: CvProfileContent, prefix: string): string {
  return newId(prefix, new Set(collectProfileIds(profile)));
}

/** Any section's items, as the generic list the structural edits work on. */
function itemsOf(profile: CvProfileContent, section: ListSection): { id: string }[] {
  return profile[section];
}

function withList(
  profile: CvProfileContent,
  section: ListSection,
  list: { id: string }[],
): CvProfileContent {
  return { ...profile, [section]: list };
}

export function addItem(
  profile: CvProfileContent,
  section: ListSection,
): { profile: CvProfileContent; id: string } {
  const id = freshId(profile, ID_PREFIX[section]);
  const list = [...itemsOf(profile, section), blankItem(section, id)];
  return { profile: withList(profile, section, list), id };
}

export function updateItem<S extends ListSection>(
  profile: CvProfileContent,
  section: S,
  id: string,
  patch: Partial<Omit<Item<S>, "id">>,
): CvProfileContent {
  const list = itemsOf(profile, section).map((item) =>
    item.id === id ? { ...item, ...patch, id: item.id } : item,
  );
  return withList(profile, section, list);
}

export function removeItem(
  profile: CvProfileContent,
  section: ListSection,
  id: string,
): CvProfileContent {
  return withList(
    profile,
    section,
    itemsOf(profile, section).filter((item) => item.id !== id),
  );
}

/** Moves an item up (-1) or down (+1); out-of-range moves leave the profile unchanged. */
export function moveItem(
  profile: CvProfileContent,
  section: ListSection,
  id: string,
  delta: -1 | 1,
): CvProfileContent {
  return withList(profile, section, moveInList(itemsOf(profile, section), id, delta));
}

function moveInList<T extends { id: string }>(list: T[], id: string, delta: -1 | 1): T[] {
  const from = list.findIndex((entry) => entry.id === id);
  const to = from + delta;
  if (from < 0 || to < 0 || to >= list.length) return list;
  const next = [...list];
  const [moved] = next.splice(from, 1);
  if (moved) next.splice(to, 0, moved);
  return next;
}

function linesOf(section: LineSection, item: Item<LineSection>): Bullet[] {
  return section === "otherSections"
    ? (item as Item<"otherSections">).items
    : (item as Item<"experience">).bullets;
}

function withLines(section: LineSection, item: Item<LineSection>, lines: Bullet[]) {
  return section === "otherSections" ? { ...item, items: lines } : { ...item, bullets: lines };
}

function editLines(
  profile: CvProfileContent,
  section: LineSection,
  itemId: string,
  change: (lines: Bullet[]) => Bullet[],
): CvProfileContent {
  const list = (profile[section] as Item<LineSection>[]).map((item) =>
    item.id === itemId ? withLines(section, item, change(linesOf(section, item))) : item,
  );
  return { ...profile, [section]: list };
}

export function addLine(
  profile: CvProfileContent,
  section: LineSection,
  itemId: string,
): { profile: CvProfileContent; id: string } {
  const id = freshId(profile, `${itemId}_b`);
  return {
    profile: editLines(profile, section, itemId, (lines) => [...lines, { id, text: "" }]),
    id,
  };
}

export function updateLine(
  profile: CvProfileContent,
  section: LineSection,
  itemId: string,
  lineId: string,
  text: string,
): CvProfileContent {
  return editLines(profile, section, itemId, (lines) =>
    lines.map((line) => (line.id === lineId ? { ...line, text } : line)),
  );
}

export function removeLine(
  profile: CvProfileContent,
  section: LineSection,
  itemId: string,
  lineId: string,
): CvProfileContent {
  return editLines(profile, section, itemId, (lines) => lines.filter((line) => line.id !== lineId));
}

export function moveLine(
  profile: CvProfileContent,
  section: LineSection,
  itemId: string,
  lineId: string,
  delta: -1 | 1,
): CvProfileContent {
  return editLines(profile, section, itemId, (lines) => moveInList(lines, lineId, delta));
}
