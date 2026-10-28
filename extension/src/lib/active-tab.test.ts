import { describe, expect, it } from "vitest";
import { activeTabIdOfHostWindow, type ActiveTabApis } from "./active-tab";

/** Two windows: the side panel's window (1) with tab 11 active, and a tab-less DevTools window (2). */
function fakeApis(hostWindowId: number | undefined): ActiveTabApis & { queried: number[] } {
  const activeTabs = new Map<number, number>([[1, 11]]);
  const queried: number[] = [];
  return {
    queried,
    getCurrentWindowId: () => Promise.resolve(hostWindowId),
    queryActiveTab: (windowId) => {
      queried.push(windowId);
      const id = activeTabs.get(windowId);
      return Promise.resolve(id === undefined ? undefined : { id });
    },
  };
}

describe("activeTabIdOfHostWindow", () => {
  it("returns the active tab of the window hosting the side panel", async () => {
    const apis = fakeApis(1);

    expect(await activeTabIdOfHostWindow(apis)).toBe(11);
    expect(apis.queried).toEqual([1]);
  });

  it("returns null when the host window has no active tab", async () => {
    expect(await activeTabIdOfHostWindow(fakeApis(2))).toBeNull();
  });

  it("returns null when the host window is unknown", async () => {
    expect(await activeTabIdOfHostWindow(fakeApis(undefined))).toBeNull();
  });
});
