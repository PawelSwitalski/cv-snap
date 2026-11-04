import { describe, expect, it, vi } from "vitest";
import type { CaptureResult } from "@/features/job-ad/messages";
import { adKeyForInput } from "@/features/tailoring/ad-key-input";
import { createCaptureOwnCvAd } from "./capture-own-cv-ad";

const AD = {
  text: "Frontend Developer at Acme",
  url: "https://jobs.example.com/1",
  structuredFields: null,
  isManualSelection: false,
};

const apis = (reply: CaptureResult) => ({ sendToTab: vi.fn(() => Promise.resolve(reply)) });

describe("createCaptureOwnCvAd", () => {
  it("returns the ad with its key, the page snapshot and the page title, asking for a snapshot", async () => {
    const page = apis({
      ok: true,
      ad: AD,
      snapshot: { status: "saved", html: "<html>ad</html>" },
      pageTitle: "Frontend Developer – Jobs",
    });

    const result = await createCaptureOwnCvAd(page)(7);

    expect(page.sendToTab).toHaveBeenCalledWith(7, { type: "capture-job-ad" });
    expect(result).toEqual({
      ok: true,
      ad: {
        ad: AD,
        adKey: await adKeyForInput(AD),
        snapshot: { status: "saved", html: "<html>ad</html>" },
        pageTitle: "Frontend Developer – Jobs",
      },
    });
  });

  it("treats a reply from an older content script as having no snapshot and no title", async () => {
    const result = await createCaptureOwnCvAd(apis({ ok: true, ad: AD }))(7);

    expect(result).toMatchObject({
      ok: true,
      ad: { snapshot: { status: "none" }, pageTitle: null },
    });
  });

  it("passes the capture failure on", async () => {
    const result = await createCaptureOwnCvAd(
      apis({ ok: false, reason: "SELECTION_TOO_SHORT", hint: "SELECT_AD_TEXT" }),
    )(7);

    expect(result).toEqual({ ok: false, reason: "SELECTION_TOO_SHORT" });
  });
});
