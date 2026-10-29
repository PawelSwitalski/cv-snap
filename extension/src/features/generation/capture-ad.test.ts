import { CvSnapError } from "@cv-snap/shared";
import { describe, expect, it } from "vitest";
import type { CaptureResult } from "@/features/job-ad/messages";
import { createCaptureAd } from "./capture-ad";

const ad = {
  text: "Senior Frontend Developer…",
  url: "https://jobs.example.com/1",
  structuredFields: null,
  isManualSelection: true,
};

const captureWith = (reply: CaptureResult | Error) =>
  createCaptureAd({
    sendToTab: () => (reply instanceof Error ? Promise.reject(reply) : Promise.resolve(reply)),
  });

async function errorOf(promise: Promise<unknown>): Promise<CvSnapError> {
  try {
    await promise;
  } catch (error) {
    if (error instanceof CvSnapError) return error;
  }
  throw new Error("expected a CvSnapError");
}

describe("createCaptureAd", () => {
  it("returns the captured ad (here the user's selection)", async () => {
    const capture = captureWith({ ok: true, ad });

    await expect(capture(7, new AbortController().signal)).resolves.toEqual(ad);
  });

  it.each([
    ["JOB_AD_NOT_DETECTED", { ok: false, reason: "JOB_AD_NOT_DETECTED", hint: "SELECT_AD_TEXT" }],
    ["SELECTION_TOO_SHORT", { ok: false, reason: "SELECTION_TOO_SHORT" }],
  ] as const)("turns %s into JOB_AD_NOT_DETECTED with the reason", async (reason, reply) => {
    const error = await errorOf(captureWith(reply)(7, new AbortController().signal));

    expect(error.code).toBe("JOB_AD_NOT_DETECTED");
    expect(error.reason).toBe(reason);
  });

  it("reports a tab without our content script as SITE_NOT_ALLOWED", async () => {
    const capture = captureWith(new Error("Receiving end does not exist."));

    const error = await errorOf(capture(7, new AbortController().signal));

    expect(error.code).toBe("JOB_AD_NOT_DETECTED");
    expect(error.reason).toBe("SITE_NOT_ALLOWED");
  });

  it("is cancelled when the signal aborted during the capture", async () => {
    const controller = new AbortController();
    controller.abort();

    const error = await errorOf(captureWith({ ok: true, ad })(7, controller.signal));

    expect(error.code).toBe("CANCELLED");
  });
});
