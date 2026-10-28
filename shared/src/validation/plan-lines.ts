import type { TailoringPlan } from "../tailoring-plan.js";
import type { LineId, PlanLineKind } from "./types.js";

/** One validatable line of a plan (ddd-01 PlanLine). Headings and gaps are never lines. */
export interface PlanLineRef {
  lineId: LineId;
  kind: PlanLineKind;
  text: string;
  sourceIds: readonly string[];
  /** For bullets: the plan item's profile ID, implicitly cited (ddd-02 decision 2). */
  parentProfileId: string | null;
}

/**
 * Lines in plan order with positional IDs: `summary[i]`, `items[<profileId>].bullets[j]`,
 * `skills[k]`. A profile ID repeated in the plan gets `~2`, `~3`… so IDs stay unique.
 */
export function planLines(plan: TailoringPlan): PlanLineRef[] {
  const lines: PlanLineRef[] = [];
  plan.summary.forEach((line, index) => {
    lines.push({
      lineId: `summary[${String(index)}]`,
      kind: "summary",
      text: line.text,
      sourceIds: line.sourceIds,
      parentProfileId: null,
    });
  });
  const occurrences = new Map<string, number>();
  for (const item of plan.items) {
    const seen = (occurrences.get(item.profileId) ?? 0) + 1;
    occurrences.set(item.profileId, seen);
    const key = seen === 1 ? item.profileId : `${item.profileId}~${String(seen)}`;
    item.bullets.forEach((bullet, index) => {
      lines.push({
        lineId: `items[${key}].bullets[${String(index)}]`,
        kind: "bullet",
        text: bullet.text,
        sourceIds: bullet.sourceIds,
        parentProfileId: item.profileId,
      });
    });
  }
  plan.skills.forEach((skill, index) => {
    lines.push({
      lineId: `skills[${String(index)}]`,
      kind: "skill",
      text: skill.name,
      sourceIds: skill.sourceIds,
      parentProfileId: null,
    });
  });
  return lines;
}

export interface LineChanges {
  /** Lines the user removed from the CV (FR-11, FR-13). */
  removedLineIds?: readonly LineId[];
  /** Replacement texts of lines the user edited. */
  editedTexts?: Readonly<Record<LineId, string>>;
}

/**
 * The plan the preview and the PDF render after the user's removals and edits (FR-13: preview ==
 * PDF). Line IDs refer to the original plan; the result is a new plan (the input is not changed).
 */
export function applyLineChanges(plan: TailoringPlan, changes: LineChanges): TailoringPlan {
  const removed = new Set(changes.removedLineIds ?? []);
  const edited = changes.editedTexts ?? {};
  const textOf = (lineId: LineId, text: string) => edited[lineId] ?? text;
  const occurrences = new Map<string, number>();
  return {
    ...plan,
    summary: plan.summary
      .map((line, index) => ({ line, lineId: `summary[${String(index)}]` }))
      .filter(({ lineId }) => !removed.has(lineId))
      .map(({ line, lineId }) => ({ ...line, text: textOf(lineId, line.text) })),
    items: plan.items.map((item) => {
      const seen = (occurrences.get(item.profileId) ?? 0) + 1;
      occurrences.set(item.profileId, seen);
      const key = seen === 1 ? item.profileId : `${item.profileId}~${String(seen)}`;
      return {
        ...item,
        bullets: item.bullets
          .map((bullet, index) => ({ bullet, lineId: `items[${key}].bullets[${String(index)}]` }))
          .filter(({ lineId }) => !removed.has(lineId))
          .map(({ bullet, lineId }) => ({ ...bullet, text: textOf(lineId, bullet.text) })),
      };
    }),
    skills: plan.skills
      .map((skill, index) => ({ skill, lineId: `skills[${String(index)}]` }))
      .filter(({ lineId }) => !removed.has(lineId))
      .map(({ skill, lineId }) => ({ ...skill, name: textOf(lineId, skill.name) })),
  };
}
