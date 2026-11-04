import { describe, expect, it } from "vitest";
import { historyEntry } from "../../../test/history-fixtures";
import { countChanges, mergeEntry } from "./merge-import";

const EARLY = "2026-10-01T10:00:00.000Z";
const LATE = "2026-11-01T10:00:00.000Z";

describe("mergeEntry", () => {
  it("adds an ad that isn't in the history", () => {
    const imported = historyEntry();

    expect(mergeEntry(null, imported)).toEqual({ kind: "add", entry: imported });
  });

  it("replaces the local entry when the backup's CV was downloaded later", () => {
    const local = historyEntry({ lastDownloadedAt: EARLY, createdAt: EARLY, fileName: "old.pdf" });
    const imported = historyEntry({ lastDownloadedAt: LATE, createdAt: LATE, fileName: "new.pdf" });

    expect(mergeEntry(local, imported)).toEqual({
      kind: "replace",
      // The backup's CV, but the first time the ad was seen.
      entry: { ...imported, createdAt: EARLY },
    });
  });

  it("keeps the local entry when it was downloaded later or at the same time", () => {
    const local = historyEntry({ lastDownloadedAt: LATE });

    expect(mergeEntry(local, historyEntry({ lastDownloadedAt: EARLY }))).toEqual({ kind: "keep" });
    expect(mergeEntry(local, historyEntry({ lastDownloadedAt: LATE }))).toEqual({ kind: "keep" });
  });

  it("takes the backup's sent date when only the backup has one, keeping the local CV", () => {
    const local = historyEntry({ lastDownloadedAt: LATE, sentOn: null });
    const imported = historyEntry({ lastDownloadedAt: LATE, sentOn: "2026-11-02" });

    expect(mergeEntry(local, imported)).toEqual({
      kind: "update",
      entry: { ...local, sentOn: "2026-11-02" },
    });
  });

  it("keeps the local sent date when the backup's newer CV has none", () => {
    const local = historyEntry({ lastDownloadedAt: EARLY, sentOn: "2026-10-05" });
    const imported = historyEntry({ lastDownloadedAt: LATE, sentOn: null });

    expect(mergeEntry(local, imported)).toMatchObject({
      kind: "replace",
      entry: { sentOn: "2026-10-05" },
    });
  });

  it("keeps the first sent date when both have one", () => {
    const local = historyEntry({ lastDownloadedAt: EARLY, sentOn: "2026-10-20" });
    const imported = historyEntry({ lastDownloadedAt: LATE, sentOn: "2026-10-03" });

    expect(mergeEntry(local, imported)).toMatchObject({ entry: { sentOn: "2026-10-03" } });
    expect(mergeEntry(imported, local)).toEqual({ kind: "keep" });
  });

  it("brings an earlier created date to a local entry that otherwise stays", () => {
    const local = historyEntry({ createdAt: LATE, lastDownloadedAt: LATE });
    const imported = historyEntry({ createdAt: EARLY, lastDownloadedAt: EARLY });

    expect(mergeEntry(local, imported)).toEqual({
      kind: "update",
      entry: { ...local, createdAt: EARLY },
    });
  });
});

describe("countChanges", () => {
  it("counts the entries an import adds or changes, not the ones it keeps", () => {
    const local = [
      historyEntry({ adKey: "same", lastDownloadedAt: LATE }),
      historyEntry({ adKey: "older-here", lastDownloadedAt: EARLY }),
    ];
    const imported = [
      historyEntry({ adKey: "same", lastDownloadedAt: LATE }),
      historyEntry({ adKey: "older-here", lastDownloadedAt: LATE }),
      historyEntry({ adKey: "new" }),
    ];

    expect(countChanges(local, imported)).toBe(2);
    expect(countChanges(local, [])).toBe(0);
  });
});
