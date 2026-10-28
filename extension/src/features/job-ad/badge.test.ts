import { describe, expect, it } from "vitest";
import {
  BADGE_COLOR,
  BADGE_TEXT,
  BADGE_TITLE_DEFAULT,
  BADGE_TITLE_DETECTED,
  clearJobAdStatus,
  readJobAdStatus,
  showJobAdStatus,
  type BadgeApis,
} from "./badge";

/** Records per-tab badge state like Chrome's action API, with an in-memory session store. */
function fakeBadge() {
  const tabs = new Map<number, { text?: string; color?: string; title?: string }>();
  const session = new Map<string, unknown>();
  const tab = (tabId: number) => {
    const state = tabs.get(tabId) ?? {};
    tabs.set(tabId, state);
    return state;
  };
  const apis: BadgeApis = {
    action: {
      setBadgeText: ({ tabId, text }) => {
        tab(tabId).text = text;
        return Promise.resolve();
      },
      setBadgeBackgroundColor: ({ tabId, color }) => {
        tab(tabId).color = color;
        return Promise.resolve();
      },
      setTitle: ({ tabId, title }) => {
        tab(tabId).title = title;
        return Promise.resolve();
      },
    },
    session: {
      get: (key) => Promise.resolve(session.has(key) ? { [key]: session.get(key) } : {}),
      set: (items) => {
        for (const [key, value] of Object.entries(items)) session.set(key, value);
        return Promise.resolve();
      },
      remove: (key) => {
        session.delete(key);
        return Promise.resolve();
      },
    },
  };
  return { apis, tabs, session };
}

describe("job-ad badge", () => {
  it('shows "CV" with an accessible title on a detected tab only', async () => {
    const fake = fakeBadge();

    await showJobAdStatus(fake.apis, 7, { isJobAd: true, url: "https://a.pl/offer" });

    expect(fake.tabs.get(7)).toEqual({
      text: BADGE_TEXT,
      color: BADGE_COLOR,
      title: BADGE_TITLE_DETECTED,
    });
    expect(fake.tabs.get(8)).toBeUndefined();
    await expect(readJobAdStatus(fake.apis, 7)).resolves.toEqual({
      isJobAd: true,
      url: "https://a.pl/offer",
    });
  });

  it("clears the badge and the stored status on a negative status", async () => {
    const fake = fakeBadge();
    await showJobAdStatus(fake.apis, 7, { isJobAd: true, url: "https://a.pl/offer" });

    await showJobAdStatus(fake.apis, 7, { isJobAd: false, url: "https://a.pl/search" });

    expect(fake.tabs.get(7)).toMatchObject({ text: "", title: BADGE_TITLE_DEFAULT });
    await expect(readJobAdStatus(fake.apis, 7)).resolves.toBeNull();
  });

  it("clears per tab (navigation or tab closed) without touching other tabs", async () => {
    const fake = fakeBadge();
    await showJobAdStatus(fake.apis, 1, { isJobAd: true, url: "https://a.pl/1" });
    await showJobAdStatus(fake.apis, 2, { isJobAd: true, url: "https://a.pl/2" });

    await clearJobAdStatus(fake.apis, 1);

    expect(fake.tabs.get(1)?.text).toBe("");
    expect(fake.tabs.get(2)?.text).toBe(BADGE_TEXT);
  });

  it("ignores malformed stored state", async () => {
    const fake = fakeBadge();
    fake.session.set("jobAdStatus:3", { isJobAd: "yes" });

    await expect(readJobAdStatus(fake.apis, 3)).resolves.toBeNull();
  });
});
