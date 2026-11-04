import { captureFromTab, type CaptureApis } from "@/features/job-ad/capture-from-tab";
import type { CaptureFailure } from "@/features/job-ad/messages";
import { adKeyForInput } from "@/features/tailoring/ad-key-input";
import type { OwnCvAd } from "./record-own-cv";

export type CaptureOwnCvAdResult =
  { ok: true; ad: OwnCvAd } | { ok: false; reason: CaptureFailure };

/**
 * Captures the ad in a tab for Save my CV to history (story 002-save-own-cv): the ad, its key and
 * the cleaned page, straight from the content script. No host, no pending snapshot: the entry is
 * written by the same click.
 */
export function createCaptureOwnCvAd(apis: CaptureApis, timeoutMs?: number) {
  return async (tabId: number): Promise<CaptureOwnCvAdResult> => {
    const result = await captureFromTab(apis, tabId, timeoutMs);
    if (!result.ok) return { ok: false, reason: result.reason };
    return {
      ok: true,
      ad: {
        ad: result.ad,
        adKey: await adKeyForInput(result.ad),
        snapshot: result.snapshot ?? { status: "none" },
        pageTitle: result.pageTitle ?? null,
      },
    };
  };
}
