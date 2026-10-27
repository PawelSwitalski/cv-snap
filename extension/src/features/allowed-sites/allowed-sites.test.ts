import { describe, expect, it } from "vitest";
import {
  createAllowedSites,
  forgetPatterns,
  METADATA_STORAGE_KEY,
  type AllowedSite,
} from "./allowed-sites";
import { createFakeChrome } from "./fake-chrome";

const NOW = new Date("2026-10-27T12:00:00.000Z");
const setup = (granted: string[] = []) => {
  const chrome = createFakeChrome({ granted });
  return { chrome, sites: createAllowedSites(chrome.apis, () => NOW) };
};

describe("createAllowedSites", () => {
  it("adds a preset by requesting exactly its origins and remembers display metadata", async () => {
    const { chrome, sites } = setup();

    const result = await sites.addPreset("stepstone");

    expect(chrome.requests).toEqual([{ origins: ["https://*.stepstone.de/*"] }]);
    expect(result).toEqual({
      ok: true,
      site: {
        pattern: "https://*.stepstone.de/*",
        label: "StepStone",
        presetId: "stepstone",
        addedAt: NOW.toISOString(),
      },
    });
    expect(await sites.listSites()).toEqual(result.ok ? [result.site] : []);
  });

  it("asks Chrome for the permission as the very first call (user gesture rule)", async () => {
    const { chrome, sites } = setup();
    let wasRequestedSynchronously = false;
    const request = chrome.apis.permissions.request.bind(chrome.apis.permissions);
    chrome.apis.permissions.request = (permissions) => {
      wasRequestedSynchronously = true;
      return request(permissions);
    };

    const pending = sites.addPreset("linkedin");
    const requestedBeforeAnyAwait = wasRequestedSynchronously;
    await pending;

    expect(requestedBeforeAnyAwait).toBe(true);
  });

  it("does not add a site when the user denies Chrome's prompt", async () => {
    const { chrome, sites } = setup();
    chrome.state.willGrant = false;

    expect(await sites.addPreset("linkedin")).toEqual({ ok: false, reason: "DENIED" });
    expect(await sites.addCurrentTab("https://jobs.example.com/x")).toEqual({
      ok: false,
      reason: "DENIED",
    });
    expect(await sites.listSites()).toEqual([]);
    expect(chrome.storage[METADATA_STORAGE_KEY]).toBeUndefined();
  });

  it("rejects an unknown preset without prompting", async () => {
    const { chrome, sites } = setup();

    expect(await sites.addPreset("monster")).toEqual({ ok: false, reason: "UNKNOWN_PRESET" });
    expect(chrome.requests).toEqual([]);
  });

  it("adds the current HTTPS tab as its own site", async () => {
    const { chrome, sites } = setup();

    const result = await sites.addCurrentTab("https://careers.example.com/jobs/42?ref=feed");

    expect(chrome.requests).toEqual([{ origins: ["https://careers.example.com/*"] }]);
    expect(result).toMatchObject({
      ok: true,
      site: {
        pattern: "https://careers.example.com/*",
        label: "careers.example.com",
        presetId: null,
      },
    });
  });

  it.each(["http://jobs.example.com/x", "chrome://extensions/", "file:///C:/cv.pdf"])(
    "refuses to add %s without prompting",
    async (url) => {
      const { chrome, sites } = setup();

      expect(await sites.addCurrentTab(url)).toEqual({ ok: false, reason: "UNSUPPORTED_SCHEME" });
      expect(chrome.requests).toEqual([]);
    },
  );

  it("removes a site by revoking its permission and forgetting its metadata", async () => {
    const { chrome, sites } = setup();
    await sites.addPreset("pracuj");

    expect(await sites.removeSite("https://*.pracuj.pl/*")).toBe(true);
    expect(chrome.granted.has("https://*.pracuj.pl/*")).toBe(false);
    expect(chrome.storage[METADATA_STORAGE_KEY]).toEqual({});
    expect(await sites.listSites()).toEqual([]);
  });

  it("lists what Chrome grants, not what storage remembers (source of truth)", async () => {
    const { chrome, sites } = setup(["https://*.linkedin.com/*", "https://jobs.example.com/*"]);
    // Stale metadata for a site whose permission is gone must not resurrect it.
    chrome.storage[METADATA_STORAGE_KEY] = {
      "https://gone.example.com/*": { label: "Gone", presetId: null, addedAt: NOW.toISOString() },
    };

    expect(await sites.listSites()).toEqual<AllowedSite[]>([
      {
        pattern: "https://*.linkedin.com/*",
        label: "LinkedIn",
        presetId: "linkedin",
        addedAt: null,
      },
      {
        pattern: "https://jobs.example.com/*",
        label: "jobs.example.com",
        presetId: null,
        addedAt: null,
      },
    ]);
  });

  it("ignores granted origins that aren't site patterns (e.g. the broad optional permission)", async () => {
    const { sites } = setup(["https://*/*", "https://*.indeed.com/*"]);

    expect((await sites.listSites()).map((site) => site.pattern)).toEqual([
      "https://*.indeed.com/*",
    ]);
  });

  it("notifies subscribers on grants and on revocations made in chrome://extensions", async () => {
    const { chrome, sites } = setup();
    const snapshots: string[][] = [];
    const unsubscribe = sites.subscribe((list) => snapshots.push(list.map((site) => site.pattern)));

    await sites.addPreset("bulldogjob");
    await flush();
    chrome.revokeExternally(["https://bulldogjob.pl/*"]);
    await flush();

    expect(snapshots).toEqual([["https://bulldogjob.pl/*"], []]);
    unsubscribe();
    expect(chrome.listenerCount()).toBe(0);
  });
});

describe("forgetPatterns", () => {
  it("drops metadata only for the given patterns and does nothing for an empty list", async () => {
    const chrome = createFakeChrome();
    chrome.storage[METADATA_STORAGE_KEY] = {
      "https://a.example.com/*": { label: "A", presetId: null, addedAt: "x" },
      "https://b.example.com/*": { label: "B", presetId: null, addedAt: "x" },
    };

    await forgetPatterns(chrome.apis, []);
    await forgetPatterns(chrome.apis, ["https://a.example.com/*"]);

    expect(Object.keys(chrome.storage[METADATA_STORAGE_KEY] as object)).toEqual([
      "https://b.example.com/*",
    ]);
  });

  it("copes with missing or corrupted metadata", async () => {
    const chrome = createFakeChrome();
    await expect(forgetPatterns(chrome.apis, ["https://a.example.com/*"])).resolves.toBeUndefined();
    chrome.storage[METADATA_STORAGE_KEY] = "garbage";
    await expect(forgetPatterns(chrome.apis, ["https://a.example.com/*"])).resolves.toBeUndefined();
  });
});

/** Lets `subscribe`'s async re-read finish. */
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
