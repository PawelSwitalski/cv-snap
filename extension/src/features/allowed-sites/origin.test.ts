import { describe, expect, it } from "vitest";
import { isSitePattern, labelForPattern, patternMatchesUrl, sitePatternForUrl } from "./origin";
import { findPreset, presetForPattern, SITE_PRESETS } from "./presets";

describe("SITE_PRESETS", () => {
  it("offers the FR-6 boards plus StepStone and theprotocol.it, all HTTPS site patterns", () => {
    expect(SITE_PRESETS.map((preset) => preset.id)).toEqual([
      "linkedin",
      "indeed",
      "pracuj",
      "justjoin",
      "nofluffjobs",
      "bulldogjob",
      "stepstone",
      "theprotocol",
    ]);
    for (const preset of SITE_PRESETS) {
      expect(preset.patterns.every(isSitePattern)).toBe(true);
    }
  });

  it("covers Indeed country sites through *.indeed.com only (user decision)", () => {
    expect(findPreset("indeed")?.patterns).toEqual(["https://*.indeed.com/*"]);
    expect(patternMatchesUrl("https://*.indeed.com/*", "https://pl.indeed.com/viewjob?jk=1")).toBe(
      true,
    );
    expect(patternMatchesUrl("https://*.indeed.com/*", "https://de.indeed.com/")).toBe(true);
    expect(patternMatchesUrl("https://*.indeed.com/*", "https://indeed.de/")).toBe(false);
  });

  it("covers StepStone job pages", () => {
    expect(
      patternMatchesUrl("https://*.stepstone.de/*", "https://www.stepstone.de/stellenangebote--x"),
    ).toBe(true);
  });

  it("finds the preset owning a pattern, and none for a custom site", () => {
    expect(presetForPattern("https://*.linkedin.com/*")?.id).toBe("linkedin");
    expect(presetForPattern("https://jobs.example.com/*")).toBeUndefined();
    expect(findPreset("monster")).toBeUndefined();
  });
});

describe("sitePatternForUrl", () => {
  it("turns an HTTPS tab URL into its host pattern (lower-cased, path and query dropped)", () => {
    expect(sitePatternForUrl("https://Jobs.Example.com/offer/123?utm_source=x")).toEqual({
      ok: true,
      pattern: "https://jobs.example.com/*",
      host: "jobs.example.com",
    });
  });

  it.each([
    ["http://jobs.example.com/offer", "UNSUPPORTED_SCHEME"],
    ["chrome://extensions", "UNSUPPORTED_SCHEME"],
    ["file:///C:/cv.pdf", "UNSUPPORTED_SCHEME"],
    ["chrome-extension://abc/sidepanel.html", "UNSUPPORTED_SCHEME"],
    ["not a url", "INVALID_URL"],
  ])("rejects %s with %s", (url, reason) => {
    expect(sitePatternForUrl(url)).toEqual({ ok: false, reason });
  });
});

describe("patternMatchesUrl", () => {
  it("matches an exact-host pattern only on that host", () => {
    expect(patternMatchesUrl("https://justjoin.it/*", "https://justjoin.it/job-offer/x")).toBe(
      true,
    );
    expect(patternMatchesUrl("https://justjoin.it/*", "https://www.justjoin.it/")).toBe(false);
  });

  it("matches a wildcard pattern on the domain and its subdomains, never look-alikes", () => {
    expect(patternMatchesUrl("https://*.pracuj.pl/*", "https://pracuj.pl/")).toBe(true);
    expect(patternMatchesUrl("https://*.pracuj.pl/*", "https://www.pracuj.pl/praca/x")).toBe(true);
    expect(patternMatchesUrl("https://*.pracuj.pl/*", "https://evilpracuj.pl/")).toBe(false);
  });

  it("never matches http pages, invalid URLs or malformed patterns", () => {
    expect(patternMatchesUrl("https://*.pracuj.pl/*", "http://www.pracuj.pl/")).toBe(false);
    expect(patternMatchesUrl("https://*.pracuj.pl/*", "nope")).toBe(false);
    expect(patternMatchesUrl("https://*/*", "https://www.pracuj.pl/")).toBe(false);
  });
});

describe("isSitePattern / labelForPattern", () => {
  it("accepts site patterns and rejects the broad optional permission", () => {
    expect(isSitePattern("https://jobs.example.com/*")).toBe(true);
    expect(isSitePattern("https://*.example.com/*")).toBe(true);
    expect(isSitePattern("https://*/*")).toBe(false);
    expect(isSitePattern("http://example.com/*")).toBe(false);
  });

  it("labels a pattern without its scheme and path", () => {
    expect(labelForPattern("https://*.example.com/*")).toBe("*.example.com");
  });
});
