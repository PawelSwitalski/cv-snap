import { MAX_AD_CHARS, TRUNCATION_MARKER } from "@cv-snap/shared";
import { describe, expect, it } from "vitest";
import {
  CaptureJobAdRequestSchema,
  CaptureResultSchema,
  JobAdStatusMessageSchema,
} from "./messages";
import { MAX_SNAPSHOT_BYTES } from "./snapshot";

describe("job-ad messages", () => {
  it("accepts a status message and rejects malformed ones", () => {
    expect(
      JobAdStatusMessageSchema.safeParse({
        type: "job-ad-status",
        isJobAd: true,
        url: "https://a.pl/x",
      }).success,
    ).toBe(true);
    expect(
      JobAdStatusMessageSchema.safeParse({ type: "job-ad-status", isJobAd: "yes" }).success,
    ).toBe(false);
    expect(
      JobAdStatusMessageSchema.safeParse({
        type: "job-ad-status",
        isJobAd: true,
        url: "x".repeat(5000),
      }).success,
    ).toBe(false);
  });

  it("accepts only the exact capture request", () => {
    expect(CaptureJobAdRequestSchema.safeParse({ type: "capture-job-ad" }).success).toBe(true);
    expect(CaptureJobAdRequestSchema.safeParse({ type: "capture" }).success).toBe(false);
  });

  it("validates capture results from the page", () => {
    const ad = { text: "Ogłoszenie", url: null, structuredFields: null, isManualSelection: false };

    expect(CaptureResultSchema.safeParse({ ok: true, ad }).success).toBe(true);
    expect(CaptureResultSchema.safeParse({ ok: false, reason: "SITE_NOT_ALLOWED" }).success).toBe(
      true,
    );
    expect(CaptureResultSchema.safeParse({ ok: false, reason: "SOMETHING_ELSE" }).success).toBe(
      false,
    );
    expect(CaptureResultSchema.safeParse({ ok: true, ad: { ...ad, text: "" } }).success).toBe(
      false,
    );
    const tooLong = "a".repeat(MAX_AD_CHARS + TRUNCATION_MARKER.length + 2);
    expect(CaptureResultSchema.safeParse({ ok: true, ad: { ...ad, text: tooLong } }).success).toBe(
      false,
    );
  });
});

describe("capture reply: page snapshot", () => {
  const ad = {
    text: "ad",
    url: "https://a.pl/x",
    structuredFields: null,
    isManualSelection: false,
  };
  const accepts = (reply: unknown) => CaptureResultSchema.safeParse(reply).success;

  it("accepts a saved, too-large or missing snapshot (an older content script sends none)", () => {
    expect(accepts({ ok: true, ad, snapshot: { status: "saved", html: "<html></html>" } })).toBe(
      true,
    );
    expect(accepts({ ok: true, ad, snapshot: { status: "too-large" } })).toBe(true);
    expect(accepts({ ok: true, ad, snapshot: { status: "none" } })).toBe(true);
    expect(accepts({ ok: true, ad })).toBe(true);
  });

  it("rejects a saved snapshot over the limit, or without its HTML", () => {
    const html = "x".repeat(MAX_SNAPSHOT_BYTES + 1);

    expect(accepts({ ok: true, ad, snapshot: { status: "saved", html } })).toBe(false);
    expect(accepts({ ok: true, ad, snapshot: { status: "saved" } })).toBe(false);
    expect(accepts({ ok: true, ad, snapshot: { status: "maybe" } })).toBe(false);
  });
});
