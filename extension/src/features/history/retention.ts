import type { HistoryRetention } from "@/features/settings/settings";
import type { HistoryEntry } from "./history-entry";

/**
 * The cut-off of a retention period (story 004-retention-setting): `now` minus N calendar months,
 * clamped to the month's last day (31 March − 1 month → 28/29 February). Null keeps everything.
 */
export function retentionCutoff(retention: HistoryRetention, now: Date): Date | null {
  if (retention.mode === "forever") return null;
  const cutoff = new Date(now);
  const day = cutoff.getDate();
  cutoff.setDate(1);
  cutoff.setMonth(cutoff.getMonth() - retention.months);
  const lastDay = new Date(cutoff.getFullYear(), cutoff.getMonth() + 1, 0).getDate();
  cutoff.setDate(Math.min(day, lastDay));
  return cutoff;
}

/**
 * Entries last downloaded before the cut-off, sent or not. An entry dated after `now` (the clock
 * was moved back) is never expired.
 */
export function expiredEntries(
  entries: readonly HistoryEntry[],
  retention: HistoryRetention,
  now: Date,
): HistoryEntry[] {
  const cutoff = retentionCutoff(retention, now);
  if (cutoff === null) return [];
  return entries.filter((entry) => Date.parse(entry.lastDownloadedAt) < cutoff.getTime());
}

/** Entries and bytes the history uses on this computer (Settings, story 004). */
export function historyUsage(entries: readonly HistoryEntry[]): { count: number; bytes: number } {
  return {
    count: entries.length,
    bytes: entries.reduce(
      (sum, entry) => sum + entry.sizes.pdf + entry.sizes.snapshot + entry.sizes.adText,
      0,
    ),
  };
}
