import { forgetPatterns } from "@/features/allowed-sites/allowed-sites";
import { browserApis } from "@/features/allowed-sites/chrome-apis";
import { browserActionClickApis, handleActionClick } from "@/features/generate/action-click";
import { clearJobAdStatus, showJobAdStatus } from "@/features/job-ad/badge";
import { createCaptureAd } from "@/features/generation/capture-ad";
import { GenerationPipeline } from "@/features/generation/generation-pipeline";
import { serveGenerationPort } from "@/features/generation/generation-port";
import { GENERATION_PORT_NAME } from "@/features/generation/messages";
import { badgeApis, captureApis } from "@/features/job-ad/browser-apis";
import { injectIntoOpenTabs, reconcileRegistrations } from "@/features/job-ad/content-registration";
import { JobAdStatusMessageSchema } from "@/features/job-ad/messages";
import { ChromeStorageProfileRepository } from "@/features/profile/profile-repository";
import { createTailoringServices } from "@/features/tailoring/services";
import { logger } from "@/lib/logger";
import { chromeLocalStore } from "@/lib/storage/local-store";

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

  // Generation (story 005): one long-lived port per side panel; closing the panel cancels the run.
  // The pipeline and its native-host connection are created on the first run only.
  let pipeline: GenerationPipeline | undefined;
  const generationPipeline = () => {
    if (!pipeline) {
      const services = createTailoringServices();
      pipeline = new GenerationPipeline({
        profiles: new ChromeStorageProfileRepository(chromeLocalStore),
        requirements: services.requirementsResolution,
        tailoring: services.tailoring,
      });
    }
    return pipeline;
  };
  const captureAd = createCaptureAd(captureApis());
  browser.runtime.onConnect.addListener((port) => {
    if (port.name !== GENERATION_PORT_NAME || port.sender?.id !== browser.runtime.id) return;
    // Only extension pages (the side panel) may generate; content scripts run in web pages.
    if (port.sender.tab !== undefined) {
      port.disconnect();
      return;
    }
    serveGenerationPort(port, {
      pipeline: { run: (request) => generationPipeline().run(request) },
      captureAd,
    });
  });

  // The toolbar icon opens the side panel through our own handler (story
  // 004-toolbar-icon-opens-panel): Chrome's built-in behaviour closes an open panel and doesn't
  // tell it about the activeTab grant. Set to false explicitly: Chrome keeps it across updates.
  browser.sidePanel.setPanelBehavior({ openPanelOnActionClick: false }).catch((error: unknown) => {
    logger.error("sidePanel.setPanelBehavior failed", error);
  });
  const actionClick = browserActionClickApis();
  browser.action.onClicked.addListener((tab) => {
    void handleActionClick(actionClick, tab.windowId);
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
