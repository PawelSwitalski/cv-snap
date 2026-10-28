import { captureAd } from "@/features/job-ad/capture";
import { CaptureJobAdRequestSchema, type CaptureResult } from "@/features/job-ad/messages";
import { startPageWatcher } from "@/features/job-ad/page-watcher";
import { logger } from "@/lib/logger";

declare global {
  interface Window {
    /** Set once per page so a re-injection (after a grant) doesn't run the script twice. */
    __cvSnapJobAdLoaded?: boolean;
  }
}

/**
 * cv-snap content script, registered at runtime only for granted sites (story
 * 002-dynamic-content-scripts). It reports whether the page is a job ad (story 003) and captures
 * the ad or the user's selection on request (stories 004 and 005). Page text is never logged.
 */
export default defineContentScript({
  // Not in the manifest; `matches` stays empty so WXT adds no host permissions.
  registration: "runtime",
  matches: [],
  main(ctx) {
    if (window.__cvSnapJobAdLoaded) return;
    window.__cvSnapJobAdLoaded = true;
    // Visible marker for the manual check (story 002); `debug` is hidden by Chrome's default level.
    if (import.meta.env.DEV) logger.info("job-ad content script ready");

    const watcher = startPageWatcher({
      document,
      getUrl: () => location.href,
      send: (message) => {
        browser.runtime.sendMessage(message).catch(() => {
          // Background asleep or extension reloaded: the next change resends.
        });
      },
      setTimeout: (callback, ms) => ctx.setTimeout(callback, ms),
      clearTimeout: (id) => {
        clearTimeout(id);
      },
      setInterval: (callback, ms) => ctx.setInterval(callback, ms),
      addWindowListener: (type, callback) => {
        ctx.addEventListener(window, type, callback);
      },
      observeMutations: (callback) => {
        const observer = new MutationObserver(callback);
        observer.observe(document.documentElement, { childList: true, subtree: true });
        return () => {
          observer.disconnect();
        };
      },
    });
    ctx.onInvalidated(() => {
      watcher.stop();
    });

    browser.runtime.onMessage.addListener(
      (message: unknown, _sender, sendResponse: (response: CaptureResult) => void) => {
        if (!CaptureJobAdRequestSchema.safeParse(message).success) return false;
        sendResponse(
          captureAd({
            document,
            url: location.href,
            selectionText: window.getSelection()?.toString() ?? null,
          }),
        );
        return false;
      },
    );
  },
});
