import { z } from "zod";
import { logger } from "@/lib/logger";

/**
 * Background → side panel after a click on the toolbar icon (story 004-toolbar-icon-opens-panel):
 * the click granted `activeTab`, which Chrome reports with no event, so the panel reads the page
 * again. Validated on receipt like every other message.
 */
export const PageAccessChangedMessageSchema = z.object({ type: z.literal("page-access-changed") });

export type PageAccessChangedMessage = z.infer<typeof PageAccessChangedMessageSchema>;

/** The extension APIs the click handler uses (tests pass a fake). */
export interface ActionClickApis {
  openPanel(windowId: number): Promise<void>;
  /** Sends to the extension's own pages; rejects when none is listening. */
  sendToPanel(message: PageAccessChangedMessage): Promise<unknown>;
}

/**
 * Handles `action.onClicked`: opens the side panel (never closes it) and tells an already open
 * panel to read the page again. `openPanel` is called before anything is awaited: Chrome only
 * allows `sidePanel.open` during the click's user gesture.
 */
export function handleActionClick(apis: ActionClickApis, windowId: number): Promise<void> {
  return apis.openPanel(windowId).then(
    () =>
      apis.sendToPanel({ type: "page-access-changed" }).then(
        () => undefined,
        () => {
          // No panel listening yet: a panel that is just opening reads the page when it starts.
        },
      ),
    (error: unknown) => {
      logger.error("sidePanel.open failed", error);
    },
  );
}

/** The real extension APIs (WXT's `browser`). */
export function browserActionClickApis(): ActionClickApis {
  return {
    openPanel: (windowId) => browser.sidePanel.open({ windowId }),
    sendToPanel: (message) => browser.runtime.sendMessage(message),
  };
}
