/**
 * Toolbar badge for detected job ads (story 003). Per tab: "CV" while the tab shows a job ad,
 * cleared on a negative status, on navigation and when the tab closes. Detection state lives in
 * `storage.session`, so it survives service-worker restarts but never reaches disk.
 */

export const BADGE_TEXT = "CV";
/** Primary accent; the badge is decorative, the title carries the meaning for screen readers. */
export const BADGE_COLOR = "#1F6FEB";
// User-facing strings move to chrome.i18n with the UI localisation story (005-tailored-cv-ui/001).
export const BADGE_TITLE_DETECTED = "cv-snap: job ad detected";
export const BADGE_TITLE_DEFAULT = "cv-snap";

const statusKey = (tabId: number) => `jobAdStatus:${String(tabId)}`;

export interface TabJobAdStatus {
  isJobAd: boolean;
  url: string;
}

export interface BadgeApis {
  action: {
    setBadgeText(details: { tabId: number; text: string }): Promise<void>;
    setBadgeBackgroundColor(details: { tabId: number; color: string }): Promise<void>;
    setTitle(details: { tabId: number; title: string }): Promise<void>;
  };
  session: {
    get(key: string): Promise<Record<string, unknown>>;
    set(items: Record<string, unknown>): Promise<void>;
    remove(key: string): Promise<void>;
  };
}

export async function showJobAdStatus(
  apis: BadgeApis,
  tabId: number,
  status: TabJobAdStatus,
): Promise<void> {
  if (!status.isJobAd) {
    await clearJobAdStatus(apis, tabId);
    return;
  }
  await Promise.all([
    apis.action.setBadgeText({ tabId, text: BADGE_TEXT }),
    apis.action.setBadgeBackgroundColor({ tabId, color: BADGE_COLOR }),
    apis.action.setTitle({ tabId, title: BADGE_TITLE_DETECTED }),
    apis.session.set({ [statusKey(tabId)]: status }),
  ]);
}

export async function clearJobAdStatus(apis: BadgeApis, tabId: number): Promise<void> {
  await Promise.all([
    apis.action.setBadgeText({ tabId, text: "" }),
    apis.action.setTitle({ tabId, title: BADGE_TITLE_DEFAULT }),
    apis.session.remove(statusKey(tabId)),
  ]);
}

/** The last detection result for a tab (null when unknown or not a job ad). */
export async function readJobAdStatus(
  apis: BadgeApis,
  tabId: number,
): Promise<TabJobAdStatus | null> {
  const stored = (await apis.session.get(statusKey(tabId)))[statusKey(tabId)];
  if (typeof stored !== "object" || stored === null) return null;
  const { isJobAd, url } = stored as Record<string, unknown>;
  return typeof isJobAd === "boolean" && typeof url === "string" ? { isJobAd, url } : null;
}
