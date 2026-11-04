import { describe, expect, it } from "vitest";
import { generationResult } from "../../../test/generate-fixtures";
import type { GeneratedAd, GenerationResult } from "@/features/generation/generation-result";
import { createMemoryHistoryRepository } from "./history-repository";
import { recordDownload } from "./record-download";

const AD: GeneratedAd = {
  adKey: "https://jobs.example.com/1#abc",
  url: "https://jobs.example.com/1",
  text: "Senior Frontend Developer at Acme Test",
  isManualSelection: false,
  snapshot: "saved",
};

const resultFor = (ad: Partial<GeneratedAd> | null = {}): GenerationResult =>
  ad === null ? generationResult() : { ...generationResult(), ad: { ...AD, ...ad } };

const pdf = (byte: number) => new Blob([new Uint8Array([0x25, byte])], { type: "application/pdf" });
const day = (date: string) => new Date(`${date}T10:00:00.000Z`);

describe("recordDownload", () => {
  it("creates the entry with the downloaded bytes, the ad's details and the pending snapshot", async () => {
    const history = createMemoryHistoryRepository();
    await history.putPending(AD.adKey, "<html>page</html>", day("2026-11-03"));
    const downloaded = pdf(1);

    const outcome = await recordDownload(history, {
      result: resultFor(),
      fileName: "CV_Jan_Testowy_Acme_Test.pdf",
      pdf: downloaded,
      now: day("2026-11-03"),
    });

    expect(outcome).toBe("saved");
    const entry = await history.get(AD.adKey);
    expect(entry).toMatchObject({
      title: generationResult().requirements.title,
      company: "Acme Test",
      url: AD.url,
      outputLanguage: "pl",
      fileName: "CV_Jan_Testowy_Acme_Test.pdf",
      createdAt: "2026-11-03T10:00:00.000Z",
      lastDownloadedAt: "2026-11-03T10:00:00.000Z",
      sentOn: null,
      snapshot: "saved",
      source: "tailored",
      sizes: { pdf: 2, snapshot: 17, adText: AD.text.length },
    });
    await expect(history.getPdf(AD.adKey)).resolves.toBe(downloaded);
    await expect(history.getSnapshot(AD.adKey)).resolves.toBe("<html>page</html>");
    await expect(history.getAdText(AD.adKey)).resolves.toBe(AD.text);
    // The pending copy moved into the entry.
    await expect(history.takePending(AD.adKey)).resolves.toBeNull();
  });

  it("replaces the PDF and date on a re-download, keeping the created and sent dates", async () => {
    const history = createMemoryHistoryRepository();
    await history.putPending(AD.adKey, "<html>v1</html>", day("2026-11-01"));
    await recordDownload(history, {
      result: resultFor(),
      fileName: "CV.pdf",
      pdf: pdf(1),
      now: day("2026-11-01"),
    });
    const first = await history.get(AD.adKey);
    if (!first) throw new Error("no entry after the first download");
    await history.put({ ...first, sentOn: "2026-11-02" }, { pdf: pdf(1), adText: AD.text });

    const second = pdf(2);
    await recordDownload(history, {
      result: resultFor(),
      fileName: "CV.pdf",
      pdf: second,
      now: day("2026-11-05"),
    });

    expect((await history.list()).entries).toHaveLength(1);
    expect(await history.get(AD.adKey)).toMatchObject({
      createdAt: "2026-11-01T10:00:00.000Z",
      lastDownloadedAt: "2026-11-05T10:00:00.000Z",
      sentOn: "2026-11-02",
      snapshot: "saved",
    });
    await expect(history.getPdf(AD.adKey)).resolves.toBe(second);
    // This capture's pending copy was already taken: the stored one stays.
    await expect(history.getSnapshot(AD.adKey)).resolves.toBe("<html>v1</html>");
  });

  it("takes a newer capture's snapshot over the stored one", async () => {
    const history = createMemoryHistoryRepository();
    await history.putPending(AD.adKey, "<html>v1</html>", day("2026-11-01"));
    await recordDownload(history, {
      result: resultFor(),
      fileName: "CV.pdf",
      pdf: pdf(1),
      now: day("2026-11-01"),
    });

    await history.putPending(AD.adKey, "<html>v2</html>", day("2026-11-04"));
    await recordDownload(history, {
      result: resultFor(),
      fileName: "CV.pdf",
      pdf: pdf(2),
      now: day("2026-11-04"),
    });

    await expect(history.getSnapshot(AD.adKey)).resolves.toBe("<html>v2</html>");
  });

  it.each(["too-large", "none"] as const)(
    "records a %s snapshot as such, with only the ad text",
    async (snapshot) => {
      const history = createMemoryHistoryRepository();

      await recordDownload(history, {
        result: resultFor({ snapshot }),
        fileName: "CV.pdf",
        pdf: pdf(1),
        now: day("2026-11-03"),
      });

      expect(await history.get(AD.adKey)).toMatchObject({ snapshot, sizes: { snapshot: 0 } });
      await expect(history.getSnapshot(AD.adKey)).resolves.toBeNull();
      await expect(history.getAdText(AD.adKey)).resolves.toBe(AD.text);
    },
  );

  it("keeps a manual selection without an address", async () => {
    const history = createMemoryHistoryRepository();

    await recordDownload(history, {
      result: resultFor({ url: null, isManualSelection: true, snapshot: "none" }),
      fileName: "CV.pdf",
      pdf: pdf(1),
      now: day("2026-11-03"),
    });

    expect(await history.get(AD.adKey)).toMatchObject({ url: null, isManualSelection: true });
  });

  it("skips a result restored from a 0.1.x session, which doesn't know its ad", async () => {
    const history = createMemoryHistoryRepository();

    const outcome = await recordDownload(history, {
      result: resultFor(null),
      fileName: "CV.pdf",
      pdf: pdf(1),
      now: day("2026-11-03"),
    });

    expect(outcome).toBe("skipped");
    expect((await history.list()).entries).toEqual([]);
  });
});
