import type { Worker } from "@playwright/test";

/**
 * Test-only access to the extension's history (bolt 027), from its service worker with raw
 * IndexedDB. The layout is `idb-keyval`'s, as the extension writes it (`history-repository.ts`):
 * metadata in `cv-snap-history`/`meta` keyed by ad, files in `cv-snap-history-files`/`files` as
 * `pdf:<adKey>`, `adText:<adKey>` and `snapshot:<adKey>`. The databases must exist already (after
 * a first download), so the extension's own store keeps working.
 */
const META = { db: "cv-snap-history", store: "meta" } as const;
const FILES = { db: "cv-snap-history-files", store: "files" } as const;

/** The history entry fields the tests read or write; the extension validates the full shape. */
export interface StoredHistoryEntry {
  adKey: string;
  title: string;
  company: string | null;
  createdAt: string;
  lastDownloadedAt: string;
  sentOn: string | null;
  [field: string]: unknown;
}

interface Write {
  db: string;
  store: string;
  key: string;
  value: unknown;
  /** Store `value` as a PDF blob, made in the worker: blobs don't cross `evaluate`. */
  isPdf?: boolean;
}

async function write(serviceWorker: Worker, writes: Write[]): Promise<void> {
  await serviceWorker.evaluate(async (items) => {
    for (const item of items) {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open(item.db);
        request.onsuccess = () => {
          resolve(request.result);
        };
        request.onerror = () => {
          reject(request.error ?? new Error("open failed"));
        };
      });
      try {
        if (!db.objectStoreNames.contains(item.store)) throw new Error(`no store ${item.store}`);
        const value = item.isPdf
          ? new Blob([String(item.value)], { type: "application/pdf" })
          : item.value;
        await new Promise<void>((resolve, reject) => {
          const transaction = db.transaction(item.store, "readwrite");
          transaction.objectStore(item.store).put(value, item.key);
          transaction.oncomplete = () => {
            resolve();
          };
          transaction.onerror = () => {
            reject(transaction.error ?? new Error("write failed"));
          };
        });
      } finally {
        db.close();
      }
    }
  }, writes);
}

/** Every stored entry's metadata. */
export async function historyEntries(serviceWorker: Worker): Promise<StoredHistoryEntry[]> {
  return serviceWorker.evaluate(async ({ db: name, store }) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(name);
      request.onsuccess = () => {
        resolve(request.result);
      };
      request.onerror = () => {
        reject(request.error ?? new Error("open failed"));
      };
    });
    try {
      if (!db.objectStoreNames.contains(store)) return [];
      return await new Promise<StoredHistoryEntry[]>((resolve, reject) => {
        const request = db.transaction(store).objectStore(store).getAll();
        request.onsuccess = () => {
          resolve(request.result as StoredHistoryEntry[]);
        };
        request.onerror = () => {
          reject(request.error ?? new Error("read failed"));
        };
      });
    } finally {
      db.close();
    }
  }, META);
}

/** Adds an entry with a small PDF and its ad text, and no page snapshot. */
export async function seedHistoryEntry(
  serviceWorker: Worker,
  entry: StoredHistoryEntry,
  adText: string,
): Promise<void> {
  const pdf = "%PDF-1.4 seeded by e2e";
  const encoder = new TextEncoder();
  const stored = {
    ...entry,
    snapshot: "none",
    sizes: {
      pdf: encoder.encode(pdf).byteLength,
      snapshot: 0,
      adText: encoder.encode(adText).byteLength,
    },
  };
  // Files first, as the extension does, so the entry never exists without its PDF.
  await write(serviceWorker, [
    { ...FILES, key: `pdf:${entry.adKey}`, value: pdf, isPdf: true },
    { ...FILES, key: `adText:${entry.adKey}`, value: adText },
    { ...META, key: entry.adKey, value: stored },
  ]);
}

/** Moves an entry's created and last-downloaded dates to `date`. */
export async function backdateHistoryEntry(
  serviceWorker: Worker,
  adKey: string,
  date: Date,
): Promise<void> {
  const entry = (await historyEntries(serviceWorker)).find((stored) => stored.adKey === adKey);
  if (!entry) throw new Error(`no history entry ${adKey}`);
  const iso = date.toISOString();
  await write(serviceWorker, [
    { ...META, key: adKey, value: { ...entry, createdAt: iso, lastDownloadedAt: iso } },
  ]);
}
