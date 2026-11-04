import { createStore, type StoreApi } from "zustand/vanilla";
import { foldForSearch } from "@/lib/fold-text";
import { logger } from "@/lib/logger";
import type { HistoryRetention } from "@/features/settings/settings";
import type { HistoryEntry, HistoryEntryWithFiles, HistoryFiles } from "./history-entry";
import type { HistoryRepository, PendingSnapshots } from "./history-repository";
import {
  recordDownload,
  type RecordDownloadInput,
  type RecordDownloadOutcome,
} from "./record-download";
import { mergeEntry } from "./merge-import";
import { recordOwnCv, type OwnCvInput } from "./record-own-cv";
import { expiredEntries } from "./retention";

export const HISTORY_FILTERS = ["all", "sent", "not-sent"] as const;
export type HistoryFilter = (typeof HISTORY_FILTERS)[number];

export interface HistoryState {
  status: "idle" | "loading" | "ready" | "failed";
  /** Last downloaded first (as the repository lists them). */
  entries: HistoryEntry[];
  unreadable: number;
  query: string;
  filter: HistoryFilter;

  load(): Promise<void>;
  /** Download PDF (bolt 023) through the store, so every view sees the new entry. */
  recordDownload(input: RecordDownloadInput): Promise<RecordDownloadOutcome>;
  /** Save my CV to history (intent 005): the user's own CV for an ad, with no host involved. */
  recordOwnCv(input: OwnCvInput): Promise<void>;
  /** Marks the entry as sent on a calendar date (`YYYY-MM-DD`), or as not sent (null). */
  setSentOn(adKey: string, sentOn: string | null): Promise<void>;
  remove(adKey: string): Promise<void>;
  /** Deletes the entries the retention setting no longer keeps; returns how many (story 004). */
  prune(retention: HistoryRetention, now: Date): Promise<number>;
  /** "Delete all history" in Settings. */
  clearAll(): Promise<void>;
  /** An entry's files for the backup file; null when they are gone. */
  readFiles(adKey: string): Promise<HistoryFiles | null>;
  /**
   * Merges validated backup entries into the history, one by one (story 002-import-merges-history);
   * returns how many were added or changed.
   */
  importEntries(items: readonly HistoryEntryWithFiles[]): Promise<number>;
  setQuery(query: string): void;
  setFilter(filter: HistoryFilter): void;
}

export type HistoryStore = StoreApi<HistoryState>;

/** Today in the user's time zone as `YYYY-MM-DD` (a sent date is a calendar date, story 002). */
export function todayLocal(now: Date = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${String(now.getFullYear())}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** Story 001: the search matches company or title, ignoring case and diacritics. */
export function visibleEntries(
  entries: readonly HistoryEntry[],
  query: string,
  filter: HistoryFilter,
): HistoryEntry[] {
  const needle = foldForSearch(query);
  return entries.filter((entry) => {
    if (filter === "sent" && entry.sentOn === null) return false;
    if (filter === "not-sent" && entry.sentOn !== null) return false;
    if (needle === "") return true;
    return foldForSearch(`${entry.company ?? ""} ${entry.title}`).includes(needle);
  });
}

/**
 * One history store per side panel (stories 001–003), shared by the History view and the Generate
 * view: a download, a sent date or a delete shows up in both at once.
 */
export function createHistoryStore(
  repository: HistoryRepository & Pick<PendingSnapshots, "takePending">,
): HistoryStore {
  return createStore<HistoryState>()((set, get) => {
    const reload = async () => {
      const list = await repository.list();
      set({ status: "ready", entries: list.entries, unreadable: list.unreadable });
    };
    return {
      status: "idle",
      entries: [],
      unreadable: 0,
      query: "",
      filter: "all",

      async load() {
        if (get().status === "idle") set({ status: "loading" });
        try {
          await reload();
        } catch (error) {
          logger.error("history not loaded", error instanceof Error ? error.name : "unknown");
          set({ status: "failed" });
        }
      },

      async recordDownload(input) {
        const outcome = await recordDownload(repository, input);
        if (outcome === "saved") await reload();
        return outcome;
      },

      async recordOwnCv(input) {
        await recordOwnCv(repository, input);
        await reload();
      },

      async setSentOn(adKey, sentOn) {
        if (sentOn !== null && sentOn > todayLocal())
          throw new RangeError("sent date in the future");
        await repository.setSentOn(adKey, sentOn);
        await reload();
      },

      async remove(adKey) {
        await repository.delete(adKey);
        await reload();
      },

      async prune(retention, now) {
        // From storage, not the last list: the panel may prune before anything was shown.
        const { entries } = await repository.list();
        const expired = expiredEntries(entries, retention, now);
        for (const entry of expired) await repository.delete(entry.adKey);
        await reload();
        if (expired.length > 0) logger.info("history pruned", expired.length);
        return expired.length;
      },

      async clearAll() {
        const { entries } = await repository.list();
        for (const entry of entries) await repository.delete(entry.adKey);
        await reload();
      },

      async readFiles(adKey) {
        const [pdf, snapshot, adText] = await Promise.all([
          repository.getPdf(adKey),
          repository.getSnapshot(adKey),
          repository.getAdText(adKey),
        ]);
        return pdf && adText !== null ? { pdf, snapshot, adText } : null;
      },

      async importEntries(items) {
        let changed = 0;
        try {
          for (const { entry, files } of items) {
            const action = mergeEntry(await repository.get(entry.adKey), entry);
            if (action.kind === "keep") continue;
            if (action.kind === "update") {
              // The local CV stays: its files are written back unchanged with the new metadata.
              const local = await get().readFiles(entry.adKey);
              if (!local) continue;
              await repository.put(action.entry, { pdf: local.pdf, adText: local.adText });
            } else {
              await repository.put(action.entry, files);
            }
            changed += 1;
          }
        } finally {
          await reload();
        }
        return changed;
      },

      setQuery(query) {
        set({ query });
      },
      setFilter(filter) {
        set({ filter });
      },
    };
  });
}
