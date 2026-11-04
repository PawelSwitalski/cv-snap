import type { HistoryEntry } from "./history-entry";

/**
 * What importing one backup entry does to the local history (story 002-import-merges-history):
 * - `add`: the ad isn't in the history yet;
 * - `replace`: the backup's CV was downloaded later, so its entry and files win;
 * - `update`: the local CV stays, but the backup brings an earlier created date or a sent date;
 * - `keep`: nothing to change.
 * In every case the written entry keeps the earlier created date and the first sent date.
 */
export type MergeAction =
  { kind: "add" | "replace" | "update"; entry: HistoryEntry } | { kind: "keep" };

/** Earlier of two sent dates; one of them if only one is set. */
function firstSent(a: string | null, b: string | null): string | null {
  if (a === null) return b;
  if (b === null) return a;
  return a < b ? a : b;
}

const earlier = (a: string, b: string) => (Date.parse(a) <= Date.parse(b) ? a : b);

export function mergeEntry(local: HistoryEntry | null, imported: HistoryEntry): MergeAction {
  if (local === null) return { kind: "add", entry: imported };
  const shared = {
    createdAt: earlier(local.createdAt, imported.createdAt),
    sentOn: firstSent(local.sentOn, imported.sentOn),
  };
  // Equal dates keep the local entry.
  if (Date.parse(imported.lastDownloadedAt) > Date.parse(local.lastDownloadedAt)) {
    return { kind: "replace", entry: { ...imported, ...shared } };
  }
  if (shared.createdAt === local.createdAt && shared.sentOn === local.sentOn) {
    return { kind: "keep" };
  }
  return { kind: "update", entry: { ...local, ...shared } };
}

/** How many entries an import would add or change (shown before the user confirms). */
export function countChanges(
  local: readonly HistoryEntry[],
  imported: readonly HistoryEntry[],
): number {
  const byKey = new Map(local.map((entry) => [entry.adKey, entry]));
  return imported.filter(
    (entry) => mergeEntry(byKey.get(entry.adKey) ?? null, entry).kind !== "keep",
  ).length;
}
