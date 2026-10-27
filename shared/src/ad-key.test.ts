import { describe, expect, it } from "vitest";
import { adKeyFor, normalizeAdUrl } from "./ad-key.js";

describe("normalizeAdUrl", () => {
  it("lower-cases the host, drops the fragment and tracking parameters, sorts the rest", () => {
    expect(
      normalizeAdUrl(
        "https://WWW.Pracuj.pl/praca/oferta,123?utm_source=x&b=2&fbclid=y&a=1&trk=z#apply",
      ),
    ).toBe("https://www.pracuj.pl/praca/oferta,123?a=1&b=2");
  });

  it.each(["gclid", "refId", "trackingId", "UTM_campaign"])("treats %s as tracking", (name) => {
    expect(normalizeAdUrl(`https://example.com/job/1?${name}=1&id=7`)).toBe(
      "https://example.com/job/1?id=7",
    );
  });

  it("keeps parameters that select the ad", () => {
    expect(normalizeAdUrl("https://example.com/jobs?currentJobId=42")).toBe(
      "https://example.com/jobs?currentJobId=42",
    );
  });

  it("returns non-URLs trimmed instead of throwing", () => {
    expect(normalizeAdUrl("  not a url ")).toBe("not a url");
  });
});

describe("adKeyFor", () => {
  it("maps tracking variants of the same ad to one key", async () => {
    expect(await adKeyFor("https://example.com/job/1?utm_source=a")).toBe(
      await adKeyFor("https://EXAMPLE.com/job/1?fbclid=b#x"),
    );
  });

  it("gives different ads different keys", async () => {
    expect(await adKeyFor("https://example.com/job/1")).not.toBe(
      await adKeyFor("https://example.com/job/2"),
    );
  });

  it("adds a hash of a manual selection, so different selections don't share an entry", async () => {
    const url = "https://example.com/board";
    const first = await adKeyFor(url, "Senior Java Developer. Wymagania: Java.");
    const second = await adKeyFor(url, "Junior Python Developer. Wymagania: Python.");

    expect(first).toMatch(/^https:\/\/example\.com\/board#sel:[0-9a-f]{16}$/);
    expect(first).not.toBe(second);
  });

  it("ignores whitespace and case differences in the selection", async () => {
    expect(await adKeyFor(null, "  Senior   JAVA\nDeveloper ")).toBe(
      await adKeyFor(null, "senior java developer"),
    );
  });

  it("never puts the selected text itself into the key", async () => {
    const key = await adKeyFor(null, "Jan Testowy secret selection");

    expect(key).toMatch(/^sel:[0-9a-f]{16}$/);
    expect(key).not.toContain("Testowy");
  });
});
