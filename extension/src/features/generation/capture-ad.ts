import { CvSnapError } from "@cv-snap/shared";
import { captureFromTab, type CaptureApis } from "@/features/job-ad/capture-from-tab";
import type { PageSnapshot } from "@/features/job-ad/snapshot";
import type { AdInput } from "@/features/tailoring/requirements-resolution";

/** What a capture gives the generation: the ad, and the cleaned page for the history. */
export interface CapturedAd {
  ad: AdInput;
  snapshot: PageSnapshot;
}

/**
 * `captureAd` for the generation port (story 005): the ad (or the user's selection) in a tab, or a
 * typed error. Capture failures stay `JOB_AD_NOT_DETECTED` with the UI reason in `reason`
 * (`SELECTION_TOO_SHORT`, `SITE_NOT_ALLOWED`), so no new `ErrorCode` is needed (bolt 008).
 */
export function createCaptureAd(apis: CaptureApis, timeoutMs?: number) {
  return async (tabId: number, signal: AbortSignal): Promise<CapturedAd> => {
    const result = await captureFromTab(apis, tabId, timeoutMs);
    if (signal.aborted) throw new CvSnapError("CANCELLED", "Generation was cancelled");
    if (result.ok) return { ad: result.ad, snapshot: result.snapshot ?? { status: "none" } };
    throw new CvSnapError("JOB_AD_NOT_DETECTED", "No job ad could be read from the page", {
      reason: result.reason,
    });
  };
}
