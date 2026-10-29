import {
  applyLineChanges,
  type CvProfile,
  type LineId,
  type LineStatus,
  type TailoringPlan,
  type ValidationRun,
} from "@cv-snap/shared";
import { buildCvModel, type BuildCvModelOptions, type CvModel } from "@/features/cv-pdf/cv-model";
import { revalidate } from "@/features/generation/revalidate";

/** The user's changes in the preview (story 006). Line IDs always refer to the generated plan. */
export interface PreviewChanges {
  /** Replacement texts: the user's own words, never validated. */
  edits: Readonly<Record<LineId, string>>;
  removed: readonly LineId[];
}

export const NO_CHANGES: PreviewChanges = { edits: {}, removed: [] };

/** How a printed line is marked in the preview (markers never reach the PDF). */
export interface LineAnnotation {
  lineId: LineId;
  status: LineStatus;
  isUserEdited: boolean;
}

/**
 * Original line IDs of the lines that survive the user's removals, in the order the CV model
 * prints them: summary lines, the bullets of each printed item (keyed by profile ID) and skills.
 */
export interface PrintedLineIds {
  summary: LineId[];
  items: Map<string, LineId[]>;
  skills: LineId[];
}

/**
 * Maps printed positions back to plan line IDs. `buildCvModel` prints each profile item once, from
 * its best-ranked plan copy (stable sort, so ties keep plan order); this mirrors that choice and the
 * `~2` occurrence keys of `planLines`.
 */
export function printedLineIds(plan: TailoringPlan, removed: readonly LineId[]): PrintedLineIds {
  const isKept = (lineId: LineId) => !removed.includes(lineId);
  const occurrenceKeys = new Map<TailoringPlan["items"][number], string>();
  const seen = new Map<string, number>();
  for (const item of plan.items) {
    const count = (seen.get(item.profileId) ?? 0) + 1;
    seen.set(item.profileId, count);
    occurrenceKeys.set(item, count === 1 ? item.profileId : `${item.profileId}~${String(count)}`);
  }
  const items = new Map<string, LineId[]>();
  for (const item of [...plan.items].sort((a, b) => a.rank - b.rank)) {
    if (items.has(item.profileId)) continue;
    const key = occurrenceKeys.get(item) ?? item.profileId;
    items.set(
      item.profileId,
      item.bullets
        .map((_, index): LineId => `items[${key}].bullets[${String(index)}]`)
        .filter(isKept),
    );
  }
  return {
    summary: plan.summary.map((_, index): LineId => `summary[${String(index)}]`).filter(isKept),
    items,
    skills: plan.skills.map((_, index): LineId => `skills[${String(index)}]`).filter(isKept),
  };
}

export interface PreviewModel {
  /** Render-ready CV of the edited plan: the input of two-page fitting, preview and PDF. */
  model: CvModel;
  /** Verdicts after the user's changes (edited lines are `skipped`, removed lines are gone). */
  validation: ValidationRun;
  lineIds: PrintedLineIds;
  annotations: ReadonlyMap<LineId, LineAnnotation>;
}

/**
 * The preview of a generation result with the user's changes (FR-13). Pure: the same result,
 * profile and changes always give the same model, so what is previewed is what is downloaded.
 */
export function buildPreviewModel(
  plan: TailoringPlan,
  profile: CvProfile,
  changes: PreviewChanges,
  options: BuildCvModelOptions = {},
): PreviewModel {
  const editedIds = Object.keys(changes.edits).filter(
    (lineId) => !changes.removed.includes(lineId),
  );
  const validation = revalidate({ plan }, profile, {
    userEditedLineIds: editedIds,
    removedLineIds: changes.removed,
  });
  const edited = applyLineChanges(plan, {
    removedLineIds: changes.removed,
    editedTexts: changes.edits,
  });
  const annotations = new Map<LineId, LineAnnotation>(
    validation.results.map((verdict) => [
      verdict.lineId,
      {
        lineId: verdict.lineId,
        status: verdict.status,
        isUserEdited: editedIds.includes(verdict.lineId),
      },
    ]),
  );
  return {
    model: buildCvModel(profile, edited, options),
    validation,
    lineIds: printedLineIds(plan, changes.removed),
    annotations,
  };
}

/** True when every line left in the CV is unverified (story 006 edge case: strong warning). */
export function isAllUnverified(validation: ValidationRun): boolean {
  const { verified, unverified, skipped } = validation.summary;
  return unverified > 0 && verified === 0 && skipped === 0;
}
