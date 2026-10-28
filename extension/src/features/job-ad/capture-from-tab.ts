import { logger } from "@/lib/logger";
import { CaptureResultSchema, type CaptureJobAdRequest, type CaptureResult } from "./messages";

/** A content script that doesn't answer in time is treated as "nothing detected". */
export const CAPTURE_TIMEOUT_MS = 3000;

export interface CaptureApis {
  sendToTab(tabId: number, message: CaptureJobAdRequest): Promise<unknown>;
}

/**
 * Asks the tab's content script for the ad (stories 004 and 005). No content script means the site
 * isn't allowed (the UI then offers "Add this site"); a slow or malformed reply counts as not
 * detected, so the UI never waits forever. The reply is validated: it comes from a page context.
 */
export async function captureFromTab(
  apis: CaptureApis,
  tabId: number,
  timeoutMs: number = CAPTURE_TIMEOUT_MS,
): Promise<CaptureResult> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<"timeout">((resolve) => {
    timer = setTimeout(() => {
      resolve("timeout");
    }, timeoutMs);
  });
  try {
    const reply = await Promise.race([apis.sendToTab(tabId, { type: "capture-job-ad" }), timeout]);
    if (reply === "timeout") return notDetected();
    const parsed = CaptureResultSchema.safeParse(reply);
    if (parsed.success) return parsed.data;
    logger.warn("ignored malformed capture reply");
    return notDetected();
  } catch {
    // "Receiving end does not exist": no content script, i.e. the site isn't granted.
    return { ok: false, reason: "SITE_NOT_ALLOWED" };
  } finally {
    clearTimeout(timer);
  }
}

function notDetected(): CaptureResult {
  return { ok: false, reason: "JOB_AD_NOT_DETECTED", hint: "SELECT_AD_TEXT" };
}
