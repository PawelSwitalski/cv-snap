import { isSitePattern, patternMatchesUrl } from "@/features/allowed-sites/origin";
import { readJobAdStatus, type TabJobAdStatus } from "@/features/job-ad/badge";
import { badgeApis } from "@/features/job-ad/browser-apis";
import { logger } from "@/lib/logger";
import { PageAccessChangedMessageSchema } from "./action-click";

/**
 * What the tab next to the panel allows (story 005). The Generate button adapts to it:
 * - `unknown-site`: Chrome hides the address (an unlisted site in a tab where the cv-snap icon
 *   wasn't clicked, so `activeTab` doesn't apply): the user clicks the icon there;
 * - `unsupported`: not an https page (chrome://, file://, http://);
 * - `site-not-allowed`: "Add this site";
 * - `no-ad` / `ad-detected`: an allowed site, with or without a detected ad.
 */
export type PageState =
  | { kind: "no-tab" }
  | { kind: "unknown-site"; tabId: number }
  | { kind: "unsupported"; tabId: number }
  | { kind: "site-not-allowed"; tabId: number; url: string }
  | { kind: "no-ad"; tabId: number; url: string }
  | { kind: "ad-detected"; tabId: number; url: string };

export interface PageFacts {
  tab: { id: number; url: string | undefined } | null;
  grantedPatterns: readonly string[];
  /** The badge's stored detection result for the tab (storage.session), or null. */
  jobAdStatus: TabJobAdStatus | null;
}

/** Pure: the page state from what Chrome reports about the active tab. */
export function derivePageState({ tab, grantedPatterns, jobAdStatus }: PageFacts): PageState {
  if (!tab) return { kind: "no-tab" };
  const { id: tabId, url } = tab;
  if (url === undefined || url === "") return { kind: "unknown-site", tabId };
  if (!url.startsWith("https://")) return { kind: "unsupported", tabId };
  const isAllowed = grantedPatterns
    .filter(isSitePattern)
    .some((pattern) => patternMatchesUrl(pattern, url));
  if (!isAllowed) return { kind: "site-not-allowed", tabId, url };
  // A status recorded for another URL of the tab (SPA navigation) doesn't count.
  const isDetected = jobAdStatus?.isJobAd === true && jobAdStatus.url === url;
  return { kind: isDetected ? "ad-detected" : "no-ad", tabId, url };
}

/** The extension APIs the page state reads and listens to (tests pass a fake). */
export interface PageStateApis {
  /** The active tab of the window that hosts the side panel. */
  activeTab(): Promise<{ id: number; url: string | undefined } | null>;
  grantedPatterns(): Promise<string[]>;
  jobAdStatus(tabId: number): Promise<TabJobAdStatus | null>;
  /** Calls `onChange` on anything that may change the state; returns the unsubscribe. */
  subscribe(onChange: () => void): () => void;
}

/**
 * Keeps `onState` up to date: on start and on every relevant event (tab switched or navigated,
 * site granted or removed, ad detected, toolbar icon clicked). Results of an older read never
 * overwrite a newer one, so after "Add this site" the button becomes Generate without reloading
 * the page.
 */
export function watchPageState(
  apis: PageStateApis,
  onState: (state: PageState) => void,
): () => void {
  let sequence = 0;
  let isStopped = false;
  const refresh = () => {
    const current = ++sequence;
    void readPageState(apis).then(
      (state) => {
        if (!isStopped && current === sequence) onState(state);
      },
      (error: unknown) => {
        logger.warn("page state not read", error instanceof Error ? error.name : "unknown");
        if (!isStopped && current === sequence) onState({ kind: "no-tab" });
      },
    );
  };
  const unsubscribe = apis.subscribe(refresh);
  refresh();
  return () => {
    isStopped = true;
    unsubscribe();
  };
}

export async function readPageState(apis: PageStateApis): Promise<PageState> {
  const tab = await apis.activeTab();
  if (!tab) return derivePageState({ tab, grantedPatterns: [], jobAdStatus: null });
  const [grantedPatterns, jobAdStatus] = await Promise.all([
    apis.grantedPatterns(),
    apis.jobAdStatus(tab.id),
  ]);
  return derivePageState({ tab, grantedPatterns, jobAdStatus });
}

/**
 * True for the background's "read the page again" after a click on the toolbar icon (story
 * 004-toolbar-icon-opens-panel), sent by cv-snap itself.
 */
export function isPageAccessChanged(
  message: unknown,
  sender: { id?: string },
  ownId: string,
): boolean {
  return sender.id === ownId && PageAccessChangedMessageSchema.safeParse(message).success;
}

/** The real extension APIs (WXT's `browser`). */
export function browserPageStateApis(): PageStateApis {
  const badge = badgeApis();
  let windowId: number | undefined;
  const hostWindowId = async () => (windowId ??= (await browser.windows.getCurrent()).id);
  return {
    async activeTab() {
      const id = await hostWindowId();
      if (id === undefined) return null;
      const [tab] = await browser.tabs.query({ active: true, windowId: id });
      return tab?.id === undefined ? null : { id: tab.id, url: tab.url };
    },
    async grantedPatterns() {
      return (await browser.permissions.getAll()).origins ?? [];
    },
    jobAdStatus: (tabId) => readJobAdStatus(badge, tabId),
    subscribe(onChange) {
      const onActivated = (info: { windowId: number }) => {
        if (windowId === undefined || info.windowId === windowId) onChange();
      };
      const onUpdated = (
        _tabId: number,
        changeInfo: { url?: string; status?: string },
        tab: { active: boolean; windowId: number },
      ) => {
        if (!tab.active || (windowId !== undefined && tab.windowId !== windowId)) return;
        if (changeInfo.url !== undefined || changeInfo.status === "complete") onChange();
      };
      const onSession = (changes: Record<string, unknown>) => {
        if (Object.keys(changes).some((key) => key.startsWith("jobAdStatus:"))) onChange();
      };
      const onMessage = (message: unknown, sender: { id?: string }) => {
        if (isPageAccessChanged(message, sender, browser.runtime.id)) onChange();
        return false;
      };
      browser.tabs.onActivated.addListener(onActivated);
      browser.tabs.onUpdated.addListener(onUpdated);
      browser.permissions.onAdded.addListener(onChange);
      browser.permissions.onRemoved.addListener(onChange);
      browser.storage.session.onChanged.addListener(onSession);
      browser.runtime.onMessage.addListener(onMessage);
      return () => {
        browser.tabs.onActivated.removeListener(onActivated);
        browser.tabs.onUpdated.removeListener(onUpdated);
        browser.permissions.onAdded.removeListener(onChange);
        browser.permissions.onRemoved.removeListener(onChange);
        browser.storage.session.onChanged.removeListener(onSession);
        browser.runtime.onMessage.removeListener(onMessage);
      };
    },
  };
}
