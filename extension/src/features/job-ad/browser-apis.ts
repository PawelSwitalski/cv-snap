import type { BadgeApis } from "./badge";
import type { CaptureApis } from "./capture-from-tab";

/**
 * Real extension APIs for the job-ad feature (WXT's `browser`). Kept apart from the allowed-sites
 * adapter so its test fakes stay unchanged. `action` and `storage.session` need no permission.
 */
export function badgeApis(): BadgeApis {
  return {
    action: {
      setBadgeText: (details) => browser.action.setBadgeText(details),
      setBadgeBackgroundColor: (details) => browser.action.setBadgeBackgroundColor(details),
      setTitle: (details) => browser.action.setTitle(details),
    },
    session: {
      get: (key) => browser.storage.session.get(key),
      set: (items) => browser.storage.session.set(items),
      remove: (key) => browser.storage.session.remove(key),
    },
  };
}

export function captureApis(): CaptureApis {
  return { sendToTab: (tabId, message) => browser.tabs.sendMessage(tabId, message) };
}
