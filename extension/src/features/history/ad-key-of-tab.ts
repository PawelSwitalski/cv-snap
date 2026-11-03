import { captureFromTab, type CaptureApis } from "@/features/job-ad/capture-from-tab";
import { adKeyForInput } from "@/features/tailoring/ad-key-input";

/**
 * Reads the ad in a tab only to know which history entry it is (story 003-already-in-history-hint):
 * no page snapshot, nothing stored. Null when nothing could be captured.
 */
export function createAdKeyOfTab(apis: CaptureApis, timeoutMs?: number) {
  return async (tabId: number): Promise<string | null> => {
    const result = await captureFromTab(apis, tabId, timeoutMs, { withSnapshot: false });
    return result.ok ? adKeyForInput(result.ad) : null;
  };
}
