import { MAX_AD_CHARS, TRUNCATION_MARKER } from "@cv-snap/shared";
import { describe, expect, it } from "vitest";
import {
  CaptureJobAdRequestSchema,
  CaptureResultSchema,
  JobAdStatusMessageSchema,
} from "./messages";

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
