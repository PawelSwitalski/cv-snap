import { describe, expect, it } from "vitest";
import { historyEntry } from "../../../test/history-fixtures";
import { createMemoryHistoryRepository } from "./history-repository";
import {
  DEFAULT_OWN_CV_NAME,
  MAX_OWN_TITLE_CHARS,
  ownCvDefaults,
  recordOwnCv,
  storedCvName,
  type OwnCvAd,
  type OwnCvInput,
} from "./record-own-cv";

const AD_KEY = historyEntry().adKey;

function ownAd(overrides: Partial<OwnCvAd> = {}): OwnCvAd {
  return {
    ad: {
      text: "Frontend Developer, Łódź",
      url: "https://jobs.example.com/1",
      structuredFields: null,
      isManualSelection: false,
    },
    adKey: AD_KEY,
    snapshot: { status: "saved", html: "<html>Ogłoszenie</html>" },
    pageTitle: "Frontend Developer – Jobs",
    ...overrides,
  };
}

const pdf = (byte: number) => new Blob([new Uint8Array([0x25, 0x50, 0x44, 0x46, byte])]);
const day = (date: string) => new Date(`${date}T10:00:00.000Z`);

function input(overrides: Partial<OwnCvInput> = {}): OwnCvInput {
  return {
    ad: ownAd(),
    pdf: pdf(1),
    fileName: "Jan_Kowalski_CV.pdf",
    title: "Frontend Developer",
    company: "Acme",
    language: "en",
    now: day("2026-11-04"),
    ...overrides,
  };
}

const bytesOf = async (blob: Blob | null) =>
  blob ? Array.from(new Uint8Array(await blob.arrayBuffer())) : null;

describe("ownCvDefaults", () => {
  it("takes the title and company from the ad's JSON-LD", () => {
    const ad = ownAd();
    ad.ad.structuredFields = { title: "Tester", company: "Acme", description: null };

    expect(ownCvDefaults(ad)).toEqual({ title: "Tester", company: "Acme" });
  });

  it("falls back to the page title and no company, trimmed and capped", () => {
    expect(ownCvDefaults(ownAd({ pageTitle: "  Frontend \n Developer  " }))).toEqual({
      title: "Frontend Developer",
      company: "",
    });
    expect(ownCvDefaults(ownAd({ pageTitle: "x".repeat(500) })).title).toHaveLength(
      MAX_OWN_TITLE_CHARS,
    );
    expect(ownCvDefaults(ownAd({ pageTitle: null }))).toEqual({ title: "", company: "" });
  });
});

describe("storedCvName", () => {
  it("keeps the stored file's name, else a default", () => {
    expect(storedCvName(new File(["%PDF"], "Moje_CV.pdf"))).toBe("Moje_CV.pdf");
    expect(storedCvName(new Blob(["%PDF"]))).toBe(DEFAULT_OWN_CV_NAME);
  });
});

describe("recordOwnCv", () => {
  it("saves the exact bytes, the ad and the snapshot as the user's own CV", async () => {
    const history = createMemoryHistoryRepository();

    const entry = await recordOwnCv(history, input());

    expect(await history.get(AD_KEY)).toEqual(entry);
    expect(entry).toMatchObject({
      source: "own",
      title: "Frontend Developer",
      company: "Acme",
      url: "https://jobs.example.com/1",
      fileName: "Jan_Kowalski_CV.pdf",
      outputLanguage: "en",
      createdAt: "2026-11-04T10:00:00.000Z",
      lastDownloadedAt: "2026-11-04T10:00:00.000Z",
      sentOn: null,
      snapshot: "saved",
    });
    expect(await bytesOf(await history.getPdf(AD_KEY))).toEqual(await bytesOf(pdf(1)));
    expect(await history.getAdText(AD_KEY)).toBe("Frontend Developer, Łódź");
    expect(await history.getSnapshot(AD_KEY)).toBe("<html>Ogłoszenie</html>");
    expect(entry.sizes).toEqual({
      pdf: 5,
      snapshot: new TextEncoder().encode("<html>Ogłoszenie</html>").byteLength,
      adText: new TextEncoder().encode("Frontend Developer, Łódź").byteLength,
    });
  });

  it("stores an empty company as unknown and trims what was typed", async () => {
    const entry = await recordOwnCv(
      createMemoryHistoryRepository(),
      input({ title: "  Tester ", company: "   " }),
    );

    expect(entry.title).toBe("Tester");
    expect(entry.company).toBeNull();
  });

  it("replaces a tailored entry for the same ad, keeping its created and sent dates", async () => {
    const history = createMemoryHistoryRepository();
    await history.put(
      historyEntry({ createdAt: "2026-10-01T10:00:00.000Z", sentOn: "2026-10-02" }),
      { pdf: pdf(9), adText: "old", snapshot: "<html>old</html>" },
    );

    await recordOwnCv(history, input({ ad: ownAd({ snapshot: { status: "none" } }) }));

    const { entries } = await history.list();
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      source: "own",
      createdAt: "2026-10-01T10:00:00.000Z",
      sentOn: "2026-10-02",
      lastDownloadedAt: "2026-11-04T10:00:00.000Z",
      // No snapshot in this capture: the stored one stays.
      snapshot: "saved",
    });
    expect(await bytesOf(await history.getPdf(AD_KEY))).toEqual(await bytesOf(pdf(1)));
    expect(await history.getSnapshot(AD_KEY)).toBe("<html>old</html>");
  });

  it("writes nothing when the entry is invalid", async () => {
    const history = createMemoryHistoryRepository();

    await expect(recordOwnCv(history, input({ language: "english" }))).rejects.toThrow();

    expect((await history.list()).entries).toEqual([]);
    expect(await history.getPdf(AD_KEY)).toBeNull();
  });

  it("saves a 10 MB CV in well under a second", async () => {
    const history = createMemoryHistoryRepository();
    const large = new Blob([new Uint8Array(10 * 1024 * 1024)]);

    const started = performance.now();
    await recordOwnCv(history, input({ pdf: large }));

    expect(performance.now() - started).toBeLessThan(1000);
    expect((await history.get(AD_KEY))?.sizes.pdf).toBe(large.size);
  });
});
