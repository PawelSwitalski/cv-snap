import { logger } from "@/lib/logger";

export default defineBackground(() => {
  // Open the side panel when the toolbar icon is clicked.
  browser.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch((error: unknown) => {
    logger.error("sidePanel.setPanelBehavior failed", error);
  });
});
