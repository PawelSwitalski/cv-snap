import { CvSnapError } from "@cv-snap/shared";
import { captureFromTab, type CaptureApis } from "@/features/job-ad/capture-from-tab";
import type { AdInput } from "@/features/tailoring/requirements-resolution";

/**
 * `captureAd` for the generation port (story 005): the ad (or the user's selection) in a tab, or a
 * typed error. Capture failures stay `JOB_AD_NOT_DETECTED` with the UI reason in `reason`
 * (`SELECTION_TOO_SHORT`, `SITE_NOT_ALLOWED`), so no new `ErrorCode` is needed (bolt 008).
 */
export function createCaptureAd(apis: CaptureApis, timeoutMs?: number) {
  return async (tabId: number, signal: AbortSignal): Promise<AdInput> => {
    const result = await captureFromTab(apis, tabId, timeoutMs);
    if (signal.aborted) throw new CvSnapError("CANCELLED", "Generation was cancelled");
    if (result.ok) return result.ad;
    throw new CvSnapError("JOB_AD_NOT_DETECTED", "No job ad could be read from the page", {
      reason: result.reason,
    });
  };
}
