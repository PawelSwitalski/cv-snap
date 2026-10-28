/** The subset of the windows/tabs APIs needed to find the tab next to the side panel. */
export interface ActiveTabApis {
  getCurrentWindowId: () => Promise<number | undefined>;
  queryActiveTab: (windowId: number) => Promise<{ id?: number | undefined } | undefined>;
}

const defaultApis: ActiveTabApis = {
  getCurrentWindowId: async () => (await browser.windows.getCurrent()).id,
  queryActiveTab: async (windowId) => (await browser.tabs.query({ active: true, windowId }))[0],
};

/**
 * Id of the active tab in the browser window that hosts the calling extension page (the side
 * panel). Not "last focused window": while the user types in DevTools or another window has focus,
 * that window would be the wrong one (it may have no tabs at all).
 */
export async function activeTabIdOfHostWindow(
  apis: ActiveTabApis = defaultApis,
): Promise<number | null> {
  const windowId = await apis.getCurrentWindowId();
  if (windowId === undefined) return null;
  const tab = await apis.queryActiveTab(windowId);
  return tab?.id ?? null;
}
