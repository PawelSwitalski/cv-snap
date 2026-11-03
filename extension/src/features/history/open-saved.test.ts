import { describe, expect, it, vi } from "vitest";
import { historyEntry } from "../../../test/history-fixtures";
import { createMemoryHistoryRepository } from "./history-repository";
import { openSavedPage, openSavedPdf, PDF_URL_LIFETIME_MS, type OpenSavedApis } from "./open-saved";

function fakeApis() {
  const timers: { callback: () => void; ms: number }[] = [];
  const opened: string[] = [];
  const revoked: string[] = [];
  const apis: OpenSavedApis = {
    openTab: (url) => {
      opened.push(url);
      return Promise.resolve();
    },
    pageUrl: (adKey) => `chrome-extension://id/history-page.html?id=${encodeURIComponent(adKey)}`,
    createObjectUrl: () => "blob:chrome-extension://id/1",
    revokeObjectUrl: (url) => {
      revoked.push(url);
    },
    setTimeout: (callback, ms) => timers.push({ callback, ms }),
  };
  return { apis, opened, revoked, timers };
}

describe("openSavedPdf", () => {
  it("opens the stored PDF from a blob URL and releases the URL a minute later", async () => {
    const history = createMemoryHistoryRepository();
    const pdf = new Blob(["%PDF"], { type: "application/pdf" });
    await history.put(historyEntry(), { pdf, adText: "a" });
    const fake = fakeApis();
    const createObjectUrl = vi.spyOn(fake.apis, "createObjectUrl");

    await expect(openSavedPdf(history, historyEntry().adKey, fake.apis)).resolves.toBe(true);

    expect(createObjectUrl).toHaveBeenCalledWith(pdf);
    expect(fake.opened).toEqual(["blob:chrome-extension://id/1"]);
    expect(fake.timers.map((timer) => timer.ms)).toEqual([PDF_URL_LIFETIME_MS]);
    fake.timers[0]?.callback();
    expect(fake.revoked).toEqual(["blob:chrome-extension://id/1"]);
  });

  it("opens nothing for a deleted entry", async () => {
    const fake = fakeApis();

    await expect(openSavedPdf(createMemoryHistoryRepository(), "gone", fake.apis)).resolves.toBe(
      false,
    );
    expect(fake.opened).toEqual([]);
  });
});

describe("openSavedPage", () => {
  it("opens the viewer page for the entry, with the key encoded", async () => {
    const fake = fakeApis();

    await openSavedPage("https://jobs.example.com/1?a=b#c", fake.apis);

    expect(fake.opened).toEqual([
      "chrome-extension://id/history-page.html?id=https%3A%2F%2Fjobs.example.com%2F1%3Fa%3Db%23c",
    ]);
  });
});
