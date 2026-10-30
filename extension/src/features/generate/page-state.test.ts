import { describe, expect, it } from "vitest";
import {
  AD_PATTERN,
  AD_URL,
  adPageFacts,
  fakePageStateApis,
} from "../../../test/generate-fixtures";
import {
  derivePageState,
  isPageAccessChanged,
  watchPageState,
  type PageState,
  type PageStateApis,
} from "./page-state";

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("derivePageState", () => {
  it("is ad-detected on an allowed page whose status matches the URL", () => {
    expect(derivePageState(adPageFacts())).toEqual({ kind: "ad-detected", tabId: 7, url: AD_URL });
  });

  it("is no-ad when the stored status is negative or for another URL of the tab", () => {
    const negative = { ...adPageFacts(), jobAdStatus: { isJobAd: false, url: AD_URL } };
    const otherUrl = {
      ...adPageFacts(),
      jobAdStatus: { isJobAd: true, url: "https://jobs.example.com/offer/2" },
    };

    expect(derivePageState(negative).kind).toBe("no-ad");
    expect(derivePageState(otherUrl).kind).toBe("no-ad");
    expect(derivePageState({ ...adPageFacts(), jobAdStatus: null }).kind).toBe("no-ad");
  });

  it("offers Add this site on an https page that isn't granted", () => {
    const facts = { ...adPageFacts(), grantedPatterns: ["https://other.example.org/*"] };

    expect(derivePageState(facts)).toEqual({ kind: "site-not-allowed", tabId: 7, url: AD_URL });
  });

  it("matches wildcard subdomain patterns and ignores the broad optional pattern", () => {
    const wildcard = { ...adPageFacts(), grantedPatterns: ["https://*.example.com/*"] };
    const broad = { ...adPageFacts(), grantedPatterns: ["https://*/*"] };

    expect(derivePageState(wildcard).kind).toBe("ad-detected");
    expect(derivePageState(broad).kind).toBe("site-not-allowed");
  });

  it("is unknown-site when Chrome hides the address (no activeTab for this tab)", () => {
    const hidden = { ...adPageFacts(), tab: { id: 3, url: undefined } };

    expect(derivePageState(hidden)).toEqual({ kind: "unknown-site", tabId: 3 });
  });

  it.each(["chrome://extensions", "http://jobs.example.com/1", "file:///C:/cv.pdf"])(
    "is unsupported on %s",
    (url) => {
      expect(derivePageState({ ...adPageFacts(), tab: { id: 3, url } }).kind).toBe("unsupported");
    },
  );

  it("is no-tab without an active tab", () => {
    expect(derivePageState({ tab: null, grantedPatterns: [], jobAdStatus: null })).toEqual({
      kind: "no-tab",
    });
  });
});

describe("watchPageState", () => {
  it("re-reads on browser events, so an approved site becomes Generate without a reload", async () => {
    const fake = fakePageStateApis({ ...adPageFacts(), grantedPatterns: [], jobAdStatus: null });
    const states: PageState[] = [];
    const stop = watchPageState(fake.apis, (state) => states.push(state));
    await settle();

    fake.facts.grantedPatterns = [AD_PATTERN];
    fake.fire(); // permissions.onAdded
    await settle();
    fake.facts.jobAdStatus = { isJobAd: true, url: AD_URL };
    fake.fire(); // the injected content script reported the ad
    await settle();

    expect(states.map((state) => state.kind)).toEqual(["site-not-allowed", "no-ad", "ad-detected"]);
    stop();
    expect(fake.listenerCount()).toBe(0);
  });

  it("never lets an older, slower read overwrite a newer one", async () => {
    const resolvers: ((tab: { id: number; url: string }) => void)[] = [];
    const apis: PageStateApis = {
      activeTab: () =>
        new Promise((resolve) => {
          resolvers.push(resolve);
        }),
      grantedPatterns: () => Promise.resolve([AD_PATTERN]),
      jobAdStatus: () => Promise.resolve(null),
      subscribe: (onChange) => {
        setTimeout(onChange, 0);
        return () => undefined;
      },
    };
    const states: PageState[] = [];
    watchPageState(apis, (state) => states.push(state));
    await settle();

    resolvers[1]?.({ id: 2, url: AD_URL });
    await settle();
    resolvers[0]?.({ id: 1, url: AD_URL });
    await settle();

    expect(states).toEqual([{ kind: "no-ad", tabId: 2, url: AD_URL }]);
  });

  it("falls back to no-tab when the browser APIs fail", async () => {
    const apis: PageStateApis = {
      activeTab: () => Promise.reject(new Error("No window")),
      grantedPatterns: () => Promise.resolve([]),
      jobAdStatus: () => Promise.resolve(null),
      subscribe: () => () => undefined,
    };
    const states: PageState[] = [];
    watchPageState(apis, (state) => states.push(state));
    await settle();

    expect(states).toEqual([{ kind: "no-tab" }]);
  });
});

describe("isPageAccessChanged", () => {
  const OWN_ID = "mmchmbhcfcoeopinlclfbgaekeocdmnf";

  it("accepts the background's page-access-changed from cv-snap itself", () => {
    expect(isPageAccessChanged({ type: "page-access-changed" }, { id: OWN_ID }, OWN_ID)).toBe(true);
  });

  it.each([
    ["another type", { type: "job-ad-status" }, OWN_ID],
    ["no message", undefined, OWN_ID],
    ["another sender", { type: "page-access-changed" }, "abcdefghijklmnopabcdefghijklmnop"],
    ["no sender ID", { type: "page-access-changed" }, undefined],
  ])("ignores %s", (_case, message, senderId) => {
    expect(isPageAccessChanged(message, { id: senderId }, OWN_ID)).toBe(false);
  });
});
