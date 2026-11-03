import { describe, expect, it } from "vitest";
import { historyEntry } from "../../../test/history-fixtures";
import { expiredEntries, historyUsage, retentionCutoff } from "./retention";

const at = (iso: string) => historyEntry({ adKey: iso, lastDownloadedAt: iso });
const keys = (entries: { adKey: string }[]) => entries.map((entry) => entry.adKey);

describe("retentionCutoff", () => {
  it("keeps everything for 'forever'", () => {
    expect(retentionCutoff({ mode: "forever" }, new Date(2026, 10, 3))).toBeNull();
  });

  it("goes back N calendar months, to the same day and time", () => {
    const now = new Date(2026, 10, 3, 14, 30);

    expect(retentionCutoff({ mode: "months", months: 3 }, now)).toEqual(
      new Date(2026, 7, 3, 14, 30),
    );
    expect(retentionCutoff({ mode: "months", months: 12 }, now)).toEqual(
      new Date(2025, 10, 3, 14, 30),
    );
    expect(retentionCutoff({ mode: "months", months: 24 }, now)).toEqual(
      new Date(2024, 10, 3, 14, 30),
    );
  });

  it("clamps to the last day of a shorter month", () => {
    expect(retentionCutoff({ mode: "months", months: 3 }, new Date(2026, 4, 31))).toEqual(
      new Date(2026, 1, 28),
    );
    expect(retentionCutoff({ mode: "months", months: 1 }, new Date(2028, 2, 31))).toEqual(
      new Date(2028, 1, 29),
    );
  });
});

describe("expiredEntries", () => {
  const now = new Date("2026-11-03T12:00:00.000Z");
  const entries = [
    at("2026-11-01T10:00:00.000Z"),
    at("2026-08-02T10:00:00.000Z"),
    at("2026-08-04T10:00:00.000Z"),
    at("2025-01-01T10:00:00.000Z"),
  ];

  it("expires nothing when kept forever", () => {
    expect(expiredEntries(entries, { mode: "forever" }, now)).toEqual([]);
  });

  it("expires entries last downloaded before the cut-off", () => {
    expect(keys(expiredEntries(entries, { mode: "months", months: 3 }, now))).toEqual([
      "2026-08-02T10:00:00.000Z",
      "2025-01-01T10:00:00.000Z",
    ]);
  });

  it("expires sent entries too", () => {
    const sent = historyEntry({
      lastDownloadedAt: "2025-01-01T10:00:00.000Z",
      sentOn: "2025-01-02",
    });

    expect(expiredEntries([sent], { mode: "months", months: 1 }, now)).toEqual([sent]);
  });

  it("never expires an entry dated after now (the clock was moved back)", () => {
    const future = at("2027-06-01T10:00:00.000Z");

    expect(expiredEntries([future], { mode: "months", months: 1 }, now)).toEqual([]);
  });
});

describe("historyUsage", () => {
  it("counts entries and adds up the bytes of every file", () => {
    const entries = [
      historyEntry({ sizes: { pdf: 1000, snapshot: 500, adText: 20 } }),
      historyEntry({ sizes: { pdf: 2000, snapshot: 0, adText: 30 } }),
    ];

    expect(historyUsage(entries)).toEqual({ count: 2, bytes: 3550 });
    expect(historyUsage([])).toEqual({ count: 0, bytes: 0 });
  });
});
