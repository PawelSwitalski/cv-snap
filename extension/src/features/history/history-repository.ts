import {
  createStore,
  del,
  delMany,
  entries,
  get,
  keys,
  set,
  values,
  type UseStore,
} from "idb-keyval";
import { logger } from "@/lib/logger";
import {
  HistoryEntrySchema,
  type HistoryEntry,
  type HistoryFiles,
  type HistoryList,
} from "./history-entry";

/**
 * Where history lives (story 001-history-store), on this PC only. Metadata and files are separate,
 * so listing never loads a PDF. Files are written before metadata and deleted after it: an
 * interruption can leave an orphan file (swept by `list`), never an entry without its PDF.
 */
export interface HistoryRepository {
  /** Metadata of every readable entry, last downloaded first. */
  list(): Promise<HistoryList>;
  get(adKey: string): Promise<HistoryEntry | null>;
  getPdf(adKey: string): Promise<Blob | null>;
  getSnapshot(adKey: string): Promise<string | null>;
  getAdText(adKey: string): Promise<string | null>;
  /**
   * Creates or replaces the entry. `snapshot: undefined` keeps the stored snapshot (a re-download
   * whose capture had none); `null` removes it.
   */
  put(
    entry: HistoryEntry,
    files: Omit<HistoryFiles, "snapshot"> & { snapshot?: string | null },
  ): Promise<void>;
  delete(adKey: string): Promise<void>;
}

/**
 * Snapshots taken at capture time, before the user decides to download (story 003). Written by
 * the background worker, taken by the side panel on download; never sent through the port or
 * session storage. Old ones are pruned on every write.
 */
export interface PendingSnapshots {
  putPending(adKey: string, html: string, now: Date): Promise<void>;
  /** The pending snapshot for the ad, removed from the pending set; null if there is none. */
  takePending(adKey: string): Promise<string | null>;
}

/** Pending snapshots older than this, or beyond the newest `MAX_PENDING`, are pruned. */
export const PENDING_TTL_MS = 24 * 60 * 60 * 1000;
export const MAX_PENDING = 10;

const fileKey = (kind: "pdf" | "snapshot" | "adText" | "pending", adKey: string) =>
  `${kind}:${adKey}`;
const PENDING_PREFIX = "pending:";

interface PendingRecord {
  html: string;
  savedAt: string;
}

const isPendingRecord = (value: unknown): value is PendingRecord =>
  typeof value === "object" &&
  value !== null &&
  typeof (value as PendingRecord).html === "string" &&
  typeof (value as PendingRecord).savedAt === "string";

/** Newest first by last download; ties keep a stable order by key. */
const byLastDownloaded = (a: HistoryEntry, b: HistoryEntry) =>
  b.lastDownloadedAt.localeCompare(a.lastDownloadedAt) || a.adKey.localeCompare(b.adKey);

/** Which pending keys to delete: too old, or beyond the newest `MAX_PENDING`. */
export function expiredPendingKeys(
  records: readonly (readonly [string, PendingRecord])[],
  now: Date,
): string[] {
  const sorted = [...records].sort(([, a], [, b]) => b.savedAt.localeCompare(a.savedAt));
  return sorted
    .filter(
      ([, record], index) =>
        index >= MAX_PENDING || now.getTime() - Date.parse(record.savedAt) > PENDING_TTL_MS,
    )
    .map(([key]) => key);
}

let metaStore: UseStore | undefined;
let filesStore: UseStore | undefined;
/** Opened on first use. Own databases: `idb-keyval` creates one store per database. */
const meta = () => (metaStore ??= createStore("cv-snap-history", "meta"));
const files = () => (filesStore ??= createStore("cv-snap-history-files", "files"));

const readString = async (key: string): Promise<string | null> => {
  const value: unknown = await get(key, files());
  return typeof value === "string" ? value : null;
};

export const indexedDbHistoryRepository: HistoryRepository & PendingSnapshots = {
  async list() {
    const stored = await values(meta());
    const list: HistoryList = { entries: [], unreadable: 0 };
    for (const value of stored) {
      const parsed = HistoryEntrySchema.safeParse(value);
      if (parsed.success) list.entries.push(parsed.data);
      else list.unreadable += 1;
    }
    if (list.unreadable > 0) logger.warn("history records skipped", list.unreadable);
    list.entries.sort(byLastDownloaded);
    void sweepOrphans(new Set(list.entries.map((entry) => entry.adKey)));
    return list;
  },

  async get(adKey) {
    const parsed = HistoryEntrySchema.safeParse(await get(adKey, meta()));
    return parsed.success ? parsed.data : null;
  },

  async getPdf(adKey) {
    const value: unknown = await get(fileKey("pdf", adKey), files());
    return value instanceof Blob ? value : null;
  },

  getSnapshot: (adKey) => readString(fileKey("snapshot", adKey)),
  getAdText: (adKey) => readString(fileKey("adText", adKey)),

  async put(entry, entryFiles) {
    // Checked before anything is written: an invalid entry must not leave its files behind.
    const valid = HistoryEntrySchema.parse(entry);
    await set(fileKey("pdf", entry.adKey), entryFiles.pdf, files());
    await set(fileKey("adText", entry.adKey), entryFiles.adText, files());
    if (entryFiles.snapshot === null) await del(fileKey("snapshot", entry.adKey), files());
    else if (entryFiles.snapshot !== undefined) {
      await set(fileKey("snapshot", entry.adKey), entryFiles.snapshot, files());
    }
    await set(entry.adKey, valid, meta());
  },

  async delete(adKey) {
    await del(adKey, meta());
    await delMany(
      [fileKey("pdf", adKey), fileKey("snapshot", adKey), fileKey("adText", adKey)],
      files(),
    );
  },

  async putPending(adKey, html, now) {
    await set(fileKey("pending", adKey), { html, savedAt: now.toISOString() }, files());
    const pending = (await entries(files())).filter(
      (pair): pair is [string, PendingRecord] =>
        typeof pair[0] === "string" &&
        pair[0].startsWith(PENDING_PREFIX) &&
        isPendingRecord(pair[1]),
    );
    const expired = expiredPendingKeys(pending, now);
    if (expired.length > 0) await delMany(expired, files());
  },

  async takePending(adKey) {
    const key = fileKey("pending", adKey);
    const value: unknown = await get(key, files());
    if (value === undefined) return null;
    await del(key, files());
    return isPendingRecord(value) ? value.html : null;
  },
};

/** Removes files whose entry is gone (an interrupted delete). Best effort, never throws. */
async function sweepOrphans(adKeys: ReadonlySet<string>): Promise<void> {
  try {
    const orphans = (await keys(files())).filter((key): key is string => {
      if (typeof key !== "string" || key.startsWith(PENDING_PREFIX)) return false;
      const adKey = key.slice(key.indexOf(":") + 1);
      return !adKeys.has(adKey);
    });
    if (orphans.length > 0) await delMany(orphans, files());
  } catch (error) {
    logger.warn("history orphan sweep failed", error instanceof Error ? error.name : "unknown");
  }
}

/** In-memory history for tests and previews (same contract as the IndexedDB adapter). */
export function createMemoryHistoryRepository(): HistoryRepository &
  PendingSnapshots & {
    meta: Map<string, unknown>;
    files: Map<string, unknown>;
  } {
  const metaMap = new Map<string, unknown>();
  const filesMap = new Map<string, unknown>();
  const string = (key: string) => {
    const value = filesMap.get(key);
    return Promise.resolve(typeof value === "string" ? value : null);
  };
  return {
    meta: metaMap,
    files: filesMap,
    list() {
      const list: HistoryList = { entries: [], unreadable: 0 };
      for (const value of metaMap.values()) {
        const parsed = HistoryEntrySchema.safeParse(value);
        if (parsed.success) list.entries.push(parsed.data);
        else list.unreadable += 1;
      }
      list.entries.sort(byLastDownloaded);
      return Promise.resolve(list);
    },
    get(adKey) {
      const parsed = HistoryEntrySchema.safeParse(metaMap.get(adKey));
      return Promise.resolve(parsed.success ? parsed.data : null);
    },
    getPdf(adKey) {
      const value = filesMap.get(fileKey("pdf", adKey));
      return Promise.resolve(value instanceof Blob ? value : null);
    },
    getSnapshot: (adKey) => string(fileKey("snapshot", adKey)),
    getAdText: (adKey) => string(fileKey("adText", adKey)),
    put(entry, entryFiles) {
      const parsed = HistoryEntrySchema.safeParse(entry);
      if (!parsed.success) return Promise.reject(parsed.error);
      filesMap.set(fileKey("pdf", entry.adKey), entryFiles.pdf);
      filesMap.set(fileKey("adText", entry.adKey), entryFiles.adText);
      if (entryFiles.snapshot === null) filesMap.delete(fileKey("snapshot", entry.adKey));
      else if (entryFiles.snapshot !== undefined) {
        filesMap.set(fileKey("snapshot", entry.adKey), entryFiles.snapshot);
      }
      metaMap.set(entry.adKey, parsed.data);
      return Promise.resolve();
    },
    delete(adKey) {
      metaMap.delete(adKey);
      for (const kind of ["pdf", "snapshot", "adText"] as const)
        filesMap.delete(fileKey(kind, adKey));
      return Promise.resolve();
    },
    putPending(adKey, html, now) {
      filesMap.set(fileKey("pending", adKey), { html, savedAt: now.toISOString() });
      const pending = [...filesMap.entries()].filter(
        (pair): pair is [string, PendingRecord] =>
          pair[0].startsWith(PENDING_PREFIX) && isPendingRecord(pair[1]),
      );
      for (const key of expiredPendingKeys(pending, now)) filesMap.delete(key);
      return Promise.resolve();
    },
    takePending(adKey) {
      const key = fileKey("pending", adKey);
      const value = filesMap.get(key);
      filesMap.delete(key);
      return Promise.resolve(isPendingRecord(value) ? value.html : null);
    },
  };
}
