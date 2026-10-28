import { describe, expect, it } from "vitest";
import { captureFromTab } from "./capture-from-tab";

const AD = {
  text: "Ogłoszenie",
  url: "https://a.pl/1",
  structuredFields: null,
  isManualSelection: false,
};

describe("captureFromTab", () => {
  it("asks the tab's content script to capture and returns its validated reply", async () => {
    const asked: unknown[] = [];

    const result = await captureFromTab(
      {
        sendToTab: (tabId, message) => {
          asked.push({ tabId, message });
          return Promise.resolve({ ok: true, ad: AD });
        },
      },
      5,
    );

    expect(asked).toEqual([{ tabId: 5, message: { type: "capture-job-ad" } }]);
    expect(result).toEqual({ ok: true, ad: AD });
  });

  it("returns SITE_NOT_ALLOWED when no content script answers (site not granted)", async () => {
    const result = await captureFromTab(
      { sendToTab: () => Promise.reject(new Error("Receiving end does not exist.")) },
      5,
    );

    expect(result).toEqual({ ok: false, reason: "SITE_NOT_ALLOWED" });
  });

  it("treats a malformed reply from the page as not detected", async () => {
    const result = await captureFromTab(
      { sendToTab: () => Promise.resolve({ ok: true, ad: { text: 42 } }) },
      5,
    );

    expect(result).toEqual({ ok: false, reason: "JOB_AD_NOT_DETECTED", hint: "SELECT_AD_TEXT" });
  });

  it("gives up after the timeout so the UI never waits forever", async () => {
    const startedAt = Date.now();

    const result = await captureFromTab({ sendToTab: () => new Promise(() => undefined) }, 5, 50);

    expect(result).toEqual({ ok: false, reason: "JOB_AD_NOT_DETECTED", hint: "SELECT_AD_TEXT" });
    expect(Date.now() - startedAt).toBeLessThan(1000);
  });
});
