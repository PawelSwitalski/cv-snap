import { describe, expect, it } from "vitest";
import { adKeyForInput } from "@/features/tailoring/ad-key-input";
import { createAdKeyOfTab } from "./ad-key-of-tab";

const AD = {
  text: "Ogłoszenie",
  url: "https://a.pl/1",
  structuredFields: null,
  isManualSelection: false,
};

describe("createAdKeyOfTab", () => {
  it("captures the ad without a snapshot and returns the same key as the history uses", async () => {
    const asked: unknown[] = [];
    const adKeyOfTab = createAdKeyOfTab({
      sendToTab: (tabId, message) => {
        asked.push({ tabId, message });
        return Promise.resolve({ ok: true, ad: AD });
      },
    });

    await expect(adKeyOfTab(4)).resolves.toBe(await adKeyForInput(AD));
    expect(asked).toEqual([{ tabId: 4, message: { type: "capture-job-ad", withSnapshot: false } }]);
  });

  it("gives null when nothing could be captured", async () => {
    const adKeyOfTab = createAdKeyOfTab({
      sendToTab: () => Promise.reject(new Error("Receiving end does not exist.")),
    });

    await expect(adKeyOfTab(4)).resolves.toBeNull();
  });
});
