import { describe, expect, it } from "vitest";
import { adPageHtml, JOB_POSTING, listingPageHtml, loadPage } from "../../../test/job-ad-fixtures";
import { captureAd } from "./capture";
import { CaptureResultSchema, MIN_SELECTION_CHARS } from "./messages";
import type { VisibilityProbe } from "./visible-content";

const URL = "https://jobs.example.com/offer/1";
const probe: VisibilityProbe = { style: (element) => getComputedStyle(element), box: () => null };
const capture = (html: string, selectionText: string | null = null) =>
  captureAd({ document: loadPage(html), url: URL, selectionText, probe });

describe("captureAd", () => {
  it("captures a detected ad with its text, URL and JSON-LD fields", () => {
    const result = capture(adPageHtml({ jsonLd: [JOB_POSTING] }));

    expect(CaptureResultSchema.safeParse(result).success).toBe(true);
    expect(result).toMatchObject({
      ok: true,
      ad: {
        url: URL,
        isManualSelection: false,
        structuredFields: { title: "Senior Frontend Developer", company: "Acme Sp. z o.o." },
      },
    });
    // The JSON-LD description is the ad body when the page has one (it keeps every section).
    const lines = result.ok ? result.ad.text.split(String.fromCharCode(10)) : [];
    expect(lines).toEqual(expect.arrayContaining(["Wymagania", "- TypeScript", "- React"]));
  });

  it("lets a selection of at least 200 characters win over automatic extraction", () => {
    const selection = `Wybrany fragment ogłoszenia. ${"Wymagania: TypeScript. ".repeat(10)}`;

    const result = capture(adPageHtml({ jsonLd: [JOB_POSTING] }), `  ${selection}\r\n`);

    expect(selection.length).toBeGreaterThanOrEqual(MIN_SELECTION_CHARS);
    expect(result).toEqual({
      ok: true,
      ad: { text: selection.trim(), url: URL, structuredFields: null, isManualSelection: true },
    });
  });

  it("works from a selection even where no ad is detected", () => {
    expect(capture(listingPageHtml(), "x".repeat(MIN_SELECTION_CHARS))).toMatchObject({
      ok: true,
      ad: { isManualSelection: true },
    });
  });

  it("rejects a selection shorter than 200 characters with a hint", () => {
    expect(capture(adPageHtml(), "Za krótki fragment")).toEqual({
      ok: false,
      reason: "SELECTION_TOO_SHORT",
      hint: "SELECT_AD_TEXT",
    });
  });

  it("returns JOB_AD_NOT_DETECTED with the select-the-text hint when nothing is detected", () => {
    expect(capture(listingPageHtml())).toEqual({
      ok: false,
      reason: "JOB_AD_NOT_DETECTED",
      hint: "SELECT_AD_TEXT",
    });
  });

  it("treats a whitespace-only selection as no selection", () => {
    expect(capture(adPageHtml(), "   \n ")).toMatchObject({
      ok: true,
      ad: { isManualSelection: false },
    });
  });
});
