import { logger } from "@/lib/logger";

declare global {
  interface Window {
    /** Set once per page so a re-injection (after a grant) doesn't run the script twice. */
    __cvSnapJobAdLoaded?: boolean;
  }
}

/**
 * cv-snap content script, registered at runtime only for granted sites (story
 * 002-dynamic-content-scripts). Job-ad detection and extraction arrive in bolt 008.
 */
export default defineContentScript({
  // Not in the manifest; `matches` stays empty so WXT adds no host permissions.
  registration: "runtime",
  matches: [],
  main() {
    if (window.__cvSnapJobAdLoaded) return;
    window.__cvSnapJobAdLoaded = true;
    // Visible marker for the manual check (story 002); `debug` is hidden by Chrome's default level.
    if (import.meta.env.DEV) logger.info("job-ad content script ready");
  },
});
