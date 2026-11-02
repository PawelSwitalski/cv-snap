import type { CvModel, CvSection } from "./cv-model";

/** FR-14: the CV is at most two A4 pages. */
export const MAX_PAGES = 2;

/** One removal the fitter may apply, in the order it applies them. */
export type DropStep =
  | { kind: "bullet"; entryId: string; bulletIndex: number }
  | { kind: "item"; entryId: string }
  | { kind: "skill"; entryId: string; bulletIndex: number }
  | { kind: "section"; entryId: string };

/** What was left out, for the UI to tell the user (story 002-two-page-fit). */
export interface DroppedContent {
  kind: "bullet" | "item" | "skill" | "section";
  entryId: string;
  /** The entry's title; for dropped sections, the section heading. */
  title: string | null;
  /** The bullet's text, for dropped bullets; the skill's name, for dropped skills. */
  text: string | null;
}

export interface FitResult {
  model: CvModel;
  dropped: DroppedContent[];
  pageCount: number;
  /** False only if even dropping everything droppable can't reach two pages. */
  fits: boolean;
}

/** Counts pages of a rendered model (a render pass in production, a fake in unit tests). */
export type PageMeasure = (model: CvModel) => Promise<number>;

const isRanked = (section: CvSection) => section.layout === "entries";

/**
 * The removal order: first the selected other sections, whole, the last selected first; then items
 * from the lowest-ranked (highest rank number) up, unranked education
 * entries first; for each item, its bullets from the end first, then the item itself unless it is
 * pinned (education). Last, the profile skills after the plan's skills, from the end. Header,
 * contact, summary, the plan's skills, languages and the clause are never dropped. Ties break by
 * plan order, so the order is deterministic.
 */
export function planDropSteps(model: CvModel): DropStep[] {
  const relevance = (rank: number | null) => rank ?? Number.MAX_SAFE_INTEGER;
  const entries = model.sections
    .filter(isRanked)
    .flatMap((section) => section.entries)
    .map((entry, order) => ({ entry, order }))
    .sort((a, b) => relevance(b.entry.rank) - relevance(a.entry.rank) || b.order - a.order);
  const steps: DropStep[] = model.sections
    .flatMap((section) => section.entries)
    .filter((entry) => entry.dropFirst)
    .reverse()
    .map((entry) => ({ kind: "section", entryId: entry.id }));
  for (const { entry } of entries) {
    for (let index = entry.bullets.length - 1; index >= 0; index--) {
      steps.push({ kind: "bullet", entryId: entry.id, bulletIndex: index });
    }
    if (!entry.pinned) steps.push({ kind: "item", entryId: entry.id });
  }
  for (const entry of model.sections
    .filter((section) => !isRanked(section))
    .flatMap((section) => section.entries)) {
    if (entry.fixedBullets === undefined) continue;
    for (let index = entry.bullets.length - 1; index >= entry.fixedBullets; index--) {
      steps.push({ kind: "skill", entryId: entry.id, bulletIndex: index });
    }
  }
  return steps;
}

/** Applies the first `count` steps; returns a new model and what was removed. Pure. */
export function applyDropSteps(
  model: CvModel,
  steps: DropStep[],
  count: number,
): { model: CvModel; dropped: DroppedContent[] } {
  const applied = steps.slice(0, count);
  const droppedItems = new Set(
    applied.filter((step) => step.kind === "item").map((step) => step.entryId),
  );
  const droppedSections = new Set(
    applied.filter((step) => step.kind === "section").map((step) => step.entryId),
  );
  const droppedBullets = new Set(
    applied.flatMap((step) =>
      step.kind === "bullet" || step.kind === "skill"
        ? [`${step.entryId}#${String(step.bulletIndex)}`]
        : [],
    ),
  );

  const dropped: DroppedContent[] = [];
  const sections = model.sections
    .filter((section) => {
      const isDropped = section.entries.some((entry) => droppedSections.has(entry.id));
      if (isDropped) {
        const id = section.entries[0]?.id ?? section.key;
        dropped.push({ kind: "section", entryId: id, title: section.heading, text: null });
      }
      return !isDropped;
    })
    .map((section) => {
      if (!isRanked(section)) return dropSkills(section, droppedBullets, dropped);
      const entries = section.entries.flatMap((entry) => {
        const removedBullets = entry.bullets.filter((_, index) =>
          droppedBullets.has(`${entry.id}#${String(index)}`),
        );
        if (droppedItems.has(entry.id)) {
          dropped.push({ kind: "item", entryId: entry.id, title: entry.title, text: null });
          return [];
        }
        for (const text of removedBullets) {
          dropped.push({ kind: "bullet", entryId: entry.id, title: entry.title, text });
        }
        return [
          {
            ...entry,
            bullets: entry.bullets.filter(
              (_, index) => !droppedBullets.has(`${entry.id}#${String(index)}`),
            ),
          },
        ];
      });
      return { ...section, entries };
    })
    .filter((section) => !isRanked(section) || section.entries.length > 0);
  return { model: { ...model, sections }, dropped };
}

/** Removes dropped profile skills; other unranked sections pass through unchanged. */
function dropSkills(
  section: CvSection,
  droppedBullets: ReadonlySet<string>,
  dropped: DroppedContent[],
): CvSection {
  if (!section.entries.some((entry) => entry.fixedBullets !== undefined)) return section;
  const entries = section.entries.map((entry) => {
    const isDropped = (index: number) => droppedBullets.has(`${entry.id}#${String(index)}`);
    for (const [index, text] of entry.bullets.entries()) {
      if (isDropped(index)) dropped.push({ kind: "skill", entryId: entry.id, title: null, text });
    }
    return { ...entry, bullets: entry.bullets.filter((_, index) => !isDropped(index)) };
  });
  return { ...section, entries };
}

/**
 * Drops the fewest steps (in `planDropSteps` order) that bring the CV to ≤ 2 pages. Each check is
 * a full render, so the count is found by binary search (page count only shrinks as content is
 * removed). The clause is part of the model, so its space is reserved before fitting.
 */
export async function fitToTwoPages(model: CvModel, measure: PageMeasure): Promise<FitResult> {
  const initialPages = await measure(model);
  if (initialPages <= MAX_PAGES) return { model, dropped: [], pageCount: initialPages, fits: true };

  const steps = planDropSteps(model);
  const pagesAt = new Map<number, number>([[0, initialPages]]);
  const pages = async (count: number) => {
    const cached = pagesAt.get(count);
    if (cached !== undefined) return cached;
    const result = await measure(applyDropSteps(model, steps, count).model);
    pagesAt.set(count, result);
    return result;
  };

  if ((await pages(steps.length)) > MAX_PAGES) {
    const all = applyDropSteps(model, steps, steps.length);
    return { ...all, pageCount: await pages(steps.length), fits: false };
  }
  let low = 0; // too long
  let high = steps.length; // fits
  while (high - low > 1) {
    const middle = Math.floor((low + high) / 2);
    if ((await pages(middle)) <= MAX_PAGES) high = middle;
    else low = middle;
  }
  const fitted = applyDropSteps(model, steps, high);
  return { ...fitted, pageCount: await pages(high), fits: true };
}
