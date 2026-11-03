// @vitest-environment node
// happy-dom Blobs do not survive fake-indexeddb cloning; Chrome stores Blobs natively.
import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { historyEntry } from "../../../test/history-fixtures";
import {
  createMemoryHistoryRepository,
  expiredPendingKeys,
  indexedDbHistoryRepository,
  MAX_PENDING,
  PENDING_TTL_MS,
  type HistoryRepository,
  type PendingSnapshots,
} from "./history-repository";

const pdf = (bytes = [0x25, 0x50, 0x44, 0x46]) =>
  new Blob([new Uint8Array(bytes)], { type: "application/pdf" });
const bytesOf = async (blob: Blob | null) => {
  if (!blob) throw new Error("no PDF stored");
  return [...new Uint8Array(await blob.arrayBuffer())];
};

type Repository = HistoryRepository & PendingSnapshots;

const adapters: [string, () => Repository][] = [
  ["memory", () => createMemoryHistoryRepository()],
  ["IndexedDB", () => indexedDbHistoryRepository],
];

describe.each(adapters)("history repository (%s)", (_name, create) => {
  let history: Repository;
  beforeEach(async () => {
    history = create();
    for (const entry of (await history.list()).entries) await history.delete(entry.adKey);
  });

  it("stores an entry and reads back the same metadata and identical PDF bytes", async () => {
    const entry = historyEntry();

    await history.put(entry, { pdf: pdf(), adText: "the ad", snapshot: "<html>x</html>" });

    await expect(history.get(entry.adKey)).resolves.toEqual(entry);
    expect(await bytesOf(await history.getPdf(entry.adKey))).toEqual([0x25, 0x50, 0x44, 0x46]);
    await expect(history.getSnapshot(entry.adKey)).resolves.toBe("<html>x</html>");
    await expect(history.getAdText(entry.adKey)).resolves.toBe("the ad");
  });

  it("keeps one entry per ad: a second put replaces the first", async () => {
    await history.put(historyEntry(), { pdf: pdf([1]), adText: "a", snapshot: null });
    await history.put(historyEntry({ fileName: "CV_2.pdf" }), {
      pdf: pdf([2]),
      adText: "a",
      snapshot: null,
    });

    const { entries } = await history.list();
    expect(entries).toHaveLength(1);
    expect(entries[0]?.fileName).toBe("CV_2.pdf");
    expect(await bytesOf(await history.getPdf(historyEntry().adKey))).toEqual([2]);
  });

  it("keeps the stored snapshot when a put passes none, and removes it for null", async () => {
    const { adKey } = historyEntry();
    await history.put(historyEntry(), { pdf: pdf(), adText: "a", snapshot: "<html>1</html>" });

    await history.put(historyEntry(), { pdf: pdf(), adText: "a" });
    await expect(history.getSnapshot(adKey)).resolves.toBe("<html>1</html>");

    await history.put(historyEntry(), { pdf: pdf(), adText: "a", snapshot: null });
    await expect(history.getSnapshot(adKey)).resolves.toBeNull();
  });

  it("lists metadata only, last downloaded first", async () => {
    for (const [adKey, at] of [
      ["a", "2026-11-01T10:00:00.000Z"],
      ["b", "2026-11-03T10:00:00.000Z"],
      ["c", "2026-11-02T10:00:00.000Z"],
    ] as const) {
      await history.put(historyEntry({ adKey, lastDownloadedAt: at }), {
        pdf: pdf(),
        adText: "a",
        snapshot: null,
      });
    }

    const { entries, unreadable } = await history.list();

    expect(entries.map((entry) => entry.adKey)).toEqual(["b", "c", "a"]);
    expect(unreadable).toBe(0);
    expect(entries.every((entry) => !("pdf" in entry))).toBe(true);
  });

  it("deletes the metadata and every file of an entry", async () => {
    const { adKey } = historyEntry();
    await history.put(historyEntry(), { pdf: pdf(), adText: "a", snapshot: "<html></html>" });

    await history.delete(adKey);

    await expect(history.get(adKey)).resolves.toBeNull();
    await expect(history.getPdf(adKey)).resolves.toBeNull();
    await expect(history.getSnapshot(adKey)).resolves.toBeNull();
    await expect(history.getAdText(adKey)).resolves.toBeNull();
  });

  it("refuses an entry that doesn't match the schema, without writing its files", async () => {
    const entry = historyEntry({ sentOn: "3 November" });

    await expect(history.put(entry, { pdf: pdf(), adText: "a" })).rejects.toThrow();

    await expect(history.getPdf(entry.adKey)).resolves.toBeNull();
    await expect(history.getAdText(entry.adKey)).resolves.toBeNull();
  });

  it("hands a pending snapshot over once", async () => {
    await history.putPending("ad-1", "<html>p</html>", new Date("2026-11-03T12:00:00Z"));

    await expect(history.takePending("ad-1")).resolves.toBe("<html>p</html>");
    await expect(history.takePending("ad-1")).resolves.toBeNull();
    await expect(history.takePending("never")).resolves.toBeNull();
  });
});

describe("history repository: unreadable records", () => {
  it("skips and counts records that fail the schema (e.g. a newer version), listing the rest", async () => {
    const history = createMemoryHistoryRepository();
    await history.put(historyEntry(), { pdf: pdf(), adText: "a" });
    history.meta.set("newer", { ...historyEntry({ adKey: "newer" }), schemaVersion: 2 });
    history.meta.set("broken", "not an entry");

    const list = await history.list();

    expect(list.entries.map((entry) => entry.adKey)).toEqual([historyEntry().adKey]);
    expect(list.unreadable).toBe(2);
    await expect(history.get("newer")).resolves.toBeNull();
  });
});

describe("history repository: 500 entries", () => {
  it("lists them in under 200 ms (metadata only)", async () => {
    const history = indexedDbHistoryRepository;
    for (const entry of (await history.list()).entries) await history.delete(entry.adKey);
    for (let index = 0; index < 500; index++) {
      const at = new Date(Date.UTC(2026, 0, 1) + index * 60_000).toISOString();
      await history.put(historyEntry({ adKey: `ad-${String(index)}`, lastDownloadedAt: at }), {
        pdf: pdf(),
        adText: "a",
      });
    }

    const started = performance.now();
    const { entries } = await history.list();
    const elapsed = performance.now() - started;

    expect(entries).toHaveLength(500);
    expect(entries[0]?.adKey).toBe("ad-499");
    expect(elapsed).toBeLessThan(200);
  });
});

describe("expiredPendingKeys", () => {
  const now = new Date("2026-11-03T12:00:00Z");
  const at = (msAgo: number) => new Date(now.getTime() - msAgo).toISOString();

  it("expires pending snapshots older than a day", () => {
    const keys = expiredPendingKeys(
      [
        ["pending:fresh", { html: "", savedAt: at(PENDING_TTL_MS - 1000) }],
        ["pending:old", { html: "", savedAt: at(PENDING_TTL_MS + 1000) }],
      ],
      now,
    );

    expect(keys).toEqual(["pending:old"]);
  });

  it("keeps only the newest ten", () => {
    const records = Array.from(
      { length: MAX_PENDING + 2 },
      (_, index) => [`pending:${String(index)}`, { html: "", savedAt: at(index * 1000) }] as const,
    );

    expect(expiredPendingKeys(records, now)).toEqual([
      `pending:${String(MAX_PENDING)}`,
      `pending:${String(MAX_PENDING + 1)}`,
    ]);
  });
});
