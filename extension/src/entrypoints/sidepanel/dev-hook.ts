import { createAllowedSites } from "@/features/allowed-sites/allowed-sites";
import { readJobAdStatus } from "@/features/job-ad/badge";
import { badgeApis, captureApis } from "@/features/job-ad/browser-apis";
import { captureFromTab } from "@/features/job-ad/capture-from-tab";
import type { CaptureResult } from "@/features/job-ad/messages";
import { activeTabIdOfHostWindow } from "@/lib/active-tab";

/**
 * Dev-only console handle (`cvSnapDev`) for the manual Chrome checks of bolts 007 and 008, until the
 * settings and generate UI exist. Loaded only in dev builds (see main.tsx). The capture command
 * reports sizes and sources only; the ad text itself is never printed.
 */
export function createDevHook() {
  return {
    allowedSites: createAllowedSites(),
    jobAd: {
      /** Captures the active tab (its selection wins) and summarises the result. */
      async capture() {
        const tabId = await activeTabIdOfHostWindow();
        if (tabId === null) return { ok: false, reason: "NO_ACTIVE_TAB" };
        return summarize(await captureFromTab(captureApis(), tabId));
      },
      /** The badge's stored detection status for the active tab. */
      async status() {
        const tabId = await activeTabIdOfHostWindow();
        return tabId === null ? null : readJobAdStatus(badgeApis(), tabId);
      },
    },
  };
}

export function summarize(result: CaptureResult) {
  if (!result.ok) return result;
  const { ad } = result;
  return {
    ok: true,
    source: ad.isManualSelection ? "selection" : "auto",
    hasJsonLd: ad.structuredFields !== null,
    textLength: ad.text.length,
    title: ad.structuredFields?.title ?? null,
    company: ad.structuredFields?.company ?? null,
    url: ad.url,
  };
}
