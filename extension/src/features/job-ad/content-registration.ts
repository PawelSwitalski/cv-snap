import type { ScriptPublicPath } from "wxt/utils/inject-script";
import { logger } from "@/lib/logger";
import type { ChromeApis } from "../allowed-sites/chrome-apis";
import { isSitePattern, patternMatchesUrl } from "../allowed-sites/origin";

/**
 * Dynamic content-script registration (story 002-dynamic-content-scripts). One registered script
 * whose `matches` are exactly the granted site origins; nothing in the manifest, so cv-snap runs
 * only where the user allowed it.
 */

export const CONTENT_SCRIPT_ID = "cv-snap-job-ad";
/** Output path of `entrypoints/job-ad.content.ts` (WXT, runtime registration). */
export const CONTENT_SCRIPT_FILE: ScriptPublicPath = "/content-scripts/job-ad.js";

export type RegistrationAction = "registered" | "updated" | "unregistered" | "unchanged";

/** Pure decision: what to do given the granted patterns and the current registration. */
export function planRegistration(
  granted: readonly string[],
  registeredMatches: readonly string[] | null,
): RegistrationAction {
  if (granted.length === 0) return registeredMatches === null ? "unchanged" : "unregistered";
  if (registeredMatches === null) return "registered";
  const same =
    granted.length === registeredMatches.length &&
    [...granted].sort().every((pattern, index) => pattern === [...registeredMatches].sort()[index]);
  return same ? "unchanged" : "updated";
}

/** Brings the registration in line with the granted permissions. Idempotent. */
export async function reconcileRegistrations(apis: ChromeApis): Promise<RegistrationAction> {
  const { origins = [] } = await apis.permissions.getAll();
  const granted = [...new Set(origins.filter(isSitePattern))].sort();
  const [existing] = await apis.scripting.getRegisteredContentScripts({ ids: [CONTENT_SCRIPT_ID] });
  const action = planRegistration(granted, existing ? (existing.matches ?? []) : null);
  switch (action) {
    case "registered":
      await apis.scripting.registerContentScripts([
        {
          id: CONTENT_SCRIPT_ID,
          js: [CONTENT_SCRIPT_FILE],
          matches: granted,
          runAt: "document_idle",
          persistAcrossSessions: true,
        },
      ]);
      break;
    case "updated":
      await apis.scripting.updateContentScripts([
        { id: CONTENT_SCRIPT_ID, js: [CONTENT_SCRIPT_FILE], matches: granted },
      ]);
      break;
    case "unregistered":
      await apis.scripting.unregisterContentScripts({ ids: [CONTENT_SCRIPT_ID] });
      break;
    case "unchanged":
      break;
  }
  logger.info("content script registration", action, granted.length);
  return action;
}

/**
 * Injects the content script into tabs that were already open on newly granted origins (story 002
 * edge case "tab opened before grant"). The script guards against running twice.
 */
export async function injectIntoOpenTabs(
  apis: ChromeApis,
  origins: readonly string[],
): Promise<number> {
  const patterns = origins.filter(isSitePattern);
  if (patterns.length === 0) return 0;
  const tabs = await apis.tabs.query({ url: patterns });
  let injected = 0;
  for (const tab of tabs) {
    if (
      tab.id === undefined ||
      !tab.url ||
      !patterns.some((p) => patternMatchesUrl(p, tab.url ?? ""))
    ) {
      continue;
    }
    try {
      await apis.scripting.executeScript({
        target: { tabId: tab.id },
        files: [CONTENT_SCRIPT_FILE],
      });
      injected++;
    } catch (error: unknown) {
      // e.g. the tab navigated away or shows an error page; it gets the script on its next load.
      logger.warn("could not inject into an open tab", error);
    }
  }
  return injected;
}
