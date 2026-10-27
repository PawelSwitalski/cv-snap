import { forgetPatterns } from "@/features/allowed-sites/allowed-sites";
import { browserApis } from "@/features/allowed-sites/chrome-apis";
import { injectIntoOpenTabs, reconcileRegistrations } from "@/features/job-ad/content-registration";
import { logger } from "@/lib/logger";

export default defineBackground(() => {
  const apis = browserApis();

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
