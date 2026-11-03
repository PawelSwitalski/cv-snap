import { createStore, type StoreApi } from "zustand/vanilla";
import { foldForSearch } from "@/lib/fold-text";
import { logger } from "@/lib/logger";
import type { HistoryEntry } from "./history-entry";
import type { HistoryRepository, PendingSnapshots } from "./history-repository";
import {
  recordDownload,
  type RecordDownloadInput,
  type RecordDownloadOutcome,
} from "./record-download";

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
  /** Marks the entry as sent on a calendar date (`YYYY-MM-DD`), or as not sent (null). */
  setSentOn(adKey: string, sentOn: string | null): Promise<void>;
  remove(adKey: string): Promise<void>;
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

      setQuery(query) {
        set({ query });
      },
      setFilter(filter) {
        set({ filter });
      },
    };
  });
}
