import { describe, expect, it } from "vitest";
import { adPageHtml, JOB_POSTING, listingPageHtml, loadPage } from "../../../test/job-ad-fixtures";
import {
  KEYWORD_THRESHOLD,
  LISTING_MIN_AD_LINKS,
  LISTING_MIN_APPLY_BUTTONS,
  scoreJobAd,
} from "./detect";

const OTHER_SITE = "https://jobs.example.com/offer/123";
const score = (html: string, url = OTHER_SITE) => scoreJobAd({ url, document: loadPage(html) });
const kinds = (html: string, url?: string) => score(html, url).signals.map((signal) => signal.kind);

describe("scoreJobAd", () => {
  it("always detects a page with a JSON-LD JobPosting, even with no keywords", () => {
    const detection = score(adPageHtml({ jsonLd: [JOB_POSTING], headings: [], applyButtons: 0 }));

    expect(detection.isJobAd).toBe(true);
    expect(detection.signals).toContainEqual({ kind: "json-ld" });
  });

  it("always detects a preset job-ad URL, even with a listing penalty", () => {
    const detection = score(
      listingPageHtml(30),
      "https://justjoin.it/job-offer/acme-senior-frontend-developer",
    );

    expect(detection.isJobAd).toBe(true);
    expect(detection.signals).toContainEqual({ kind: "url-pattern", presetId: "justjoin" });
  });

  it("detects a keyword-only ad: apply button + requirements + responsibilities + offer", () => {
    const detection = score(adPageHtml());

    expect(detection.score).toBe(8);
    expect(detection.score).toBeGreaterThanOrEqual(KEYWORD_THRESHOLD);
    expect(detection.isJobAd).toBe(true);
  });

  it("detects English and German ads by their section headings", () => {
    expect(
      score(
        adPageHtml({
          headings: ["Responsibilities", "Requirements", "We offer"],
          applyLabel: "Apply now",
        }),
      ).isJobAd,
    ).toBe(true);
    expect(
      score(
        adPageHtml({
          headings: ["Ihre Aufgaben", "Ihr Profil", "Wir bieten"],
          applyLabel: "Jetzt bewerben",
        }),
      ).isJobAd,
    ).toBe(true);
  });

  it('counts the "aplikuj szybko" button variant (seen on real pages)', () => {
    expect(score(adPageHtml({ applyLabel: "aplikuj szybko" })).signals).toContainEqual({
      kind: "keyword",
      id: "apply",
      points: 3,
    });
  });

  it("keeps a single ad detected with repeated apply buttons and similar-offer links (tuned on real pages)", () => {
    const detection = score(
      adPageHtml({
        applyButtons: LISTING_MIN_APPLY_BUTTONS - 3,
        similarAdLinks: LISTING_MIN_AD_LINKS - 1,
      }),
    );

    expect(detection.signals.map((signal) => signal.kind)).not.toContain("listing-guard");
    expect(detection.isJobAd).toBe(true);
  });

  it("does not detect a listing/search page with many ad links and apply buttons", () => {
    const detection = score(listingPageHtml(20));

    expect(detection.signals).toContainEqual({ kind: "listing-guard", points: -6 });
    expect(detection.isJobAd).toBe(false);
  });

  it("applies the listing guard from many apply buttons alone", () => {
    expect(kinds(adPageHtml({ applyButtons: LISTING_MIN_APPLY_BUTTONS }))).toContain(
      "listing-guard",
    );
  });

  it("stays below the threshold with a single weak signal", () => {
    const detection = score(adPageHtml({ headings: ["Wynagrodzenie"], applyButtons: 0 }));

    expect(detection.score).toBe(1);
    expect(detection.isJobAd).toBe(false);
  });

  it("ignores headings longer than a heading (body text that mentions requirements)", () => {
    const longHeading = `Wymagania ${"bardzo długi tekst ".repeat(10)}`;

    expect(kinds(adPageHtml({ headings: [longHeading], applyButtons: 0 }))).toEqual([]);
  });

  it("does not detect an ordinary page", () => {
    const page =
      "<html><body><h1>Blog</h1><p>Hello world</p><a href='/x'>Read more</a></body></html>";

    expect(score(page)).toEqual({ score: 0, isJobAd: false, signals: [] });
  });
});
