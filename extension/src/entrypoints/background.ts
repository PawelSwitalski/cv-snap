import { forgetPatterns } from "@/features/allowed-sites/allowed-sites";
import { browserApis } from "@/features/allowed-sites/chrome-apis";
import { clearJobAdStatus, showJobAdStatus } from "@/features/job-ad/badge";
import { badgeApis } from "@/features/job-ad/browser-apis";
import { injectIntoOpenTabs, reconcileRegistrations } from "@/features/job-ad/content-registration";
import { JobAdStatusMessageSchema } from "@/features/job-ad/messages";
import { logger } from "@/lib/logger";

export default defineBackground(() => {
  const apis = browserApis();
  const badge = badgeApis();

  // Job-ad badge (story 003): status comes from our own content scripts in a tab, validated.
  browser.runtime.onMessage.addListener((message: unknown, sender) => {
    const parsed = JobAdStatusMessageSchema.safeParse(message);
    const tabId = sender.tab?.id;
    if (!parsed.success || tabId === undefined || sender.id !== browser.runtime.id) return false;
    showJobAdStatus(badge, tabId, parsed.data).catch((error: unknown) => {
      logger.error("job-ad badge update failed", error);
    });
    return false;
  });
  const clearBadge = (tabId: number) => {
    clearJobAdStatus(badge, tabId).catch(() => {
      // Tab already gone: nothing to clear.
    });
  };
  browser.tabs.onUpdated.addListener((tabId, changeInfo) => {
    // A new page load starts undetected; its content script reports again once scored.
    if (changeInfo.status === "loading") clearBadge(tabId);
  });
  browser.tabs.onRemoved.addListener((tabId) => {
    clearBadge(tabId);
  });

  // Open the side panel when the toolbar icon is clicked.
  browser.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch((error: unknown) => {
    logger.error("sidePanel.setPanelBehavior failed", error);
  });

  const reconcile = () =>
    reconcileRegistrations(apis).catch((error: unknown) => {
      logger.error("content script reconcile failed", error);
    });

  // Listeners are registered synchronously so the service worker wakes up for these events.
  browser.runtime.onInstalled.addListener(() => {
    void reconcile();
  });
  browser.runtime.onStartup.addListener(() => {
    void reconcile();
  });
  browser.permissions.onAdded.addListener((permissions) => {
    void reconcile().then(() =>
      injectIntoOpenTabs(apis, permissions.origins ?? []).catch((error: unknown) => {
        logger.error("injection into open tabs failed", error);
      }),
    );
  });
  browser.permissions.onRemoved.addListener((permissions) => {
    void reconcile();
    // Revoked in chrome://extensions (or by cv-snap): drop its display metadata too.
    forgetPatterns(apis, permissions.origins ?? []).catch((error: unknown) => {
      logger.error("allowed-site metadata clean-up failed", error);
    });
  });
});
