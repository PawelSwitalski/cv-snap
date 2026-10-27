import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createAllowedSites } from "../allowed-sites/allowed-sites";
import { createFakeChrome } from "../allowed-sites/fake-chrome";
import {
  CONTENT_SCRIPT_FILE,
  CONTENT_SCRIPT_ID,
  injectIntoOpenTabs,
  planRegistration,
  reconcileRegistrations,
} from "./content-registration";

describe("planRegistration", () => {
  it.each([
    [[], null, "unchanged"],
    [[], ["https://a.example.com/*"], "unregistered"],
    [["https://a.example.com/*"], null, "registered"],
    [
      ["https://a.example.com/*", "https://b.example.com/*"],
      ["https://b.example.com/*", "https://a.example.com/*"],
      "unchanged",
    ],
    [["https://a.example.com/*"], ["https://b.example.com/*"], "updated"],
    [
      ["https://a.example.com/*", "https://b.example.com/*"],
      ["https://a.example.com/*"],
      "updated",
    ],
  ] as const)("granted %j, registered %j → %s", (granted, registered, action) => {
    expect(planRegistration(granted, registered)).toBe(action);
  });
});

describe("reconcileRegistrations", () => {
  it("registers one persistent script matching exactly the granted site origins", async () => {
    const chrome = createFakeChrome({ granted: ["https://*.linkedin.com/*", "https://*/*"] });

    expect(await reconcileRegistrations(chrome.apis)).toBe("registered");
    expect([...chrome.registered.values()]).toEqual([
      {
        id: CONTENT_SCRIPT_ID,
        js: [CONTENT_SCRIPT_FILE],
        matches: ["https://*.linkedin.com/*"],
        runAt: "document_idle",
        persistAcrossSessions: true,
      },
    ]);
  });

  it("follows grants and revocations, and is idempotent", async () => {
    const chrome = createFakeChrome({ granted: ["https://*.linkedin.com/*"] });
    await reconcileRegistrations(chrome.apis);

    chrome.granted.add("https://justjoin.it/*");
    expect(await reconcileRegistrations(chrome.apis)).toBe("updated");
    expect(chrome.registered.get(CONTENT_SCRIPT_ID)?.matches).toEqual([
      "https://*.linkedin.com/*",
      "https://justjoin.it/*",
    ]);
    expect(await reconcileRegistrations(chrome.apis)).toBe("unchanged");

    chrome.granted.clear();
    expect(await reconcileRegistrations(chrome.apis)).toBe("unregistered");
    expect(chrome.registered.size).toBe(0);
    expect(await reconcileRegistrations(chrome.apis)).toBe("unchanged");
  });

  it("keeps the registration persistent across browser restarts after an update", async () => {
    const chrome = createFakeChrome({ granted: ["https://*.linkedin.com/*"] });
    await reconcileRegistrations(chrome.apis);
    chrome.granted.add("https://justjoin.it/*");

    await reconcileRegistrations(chrome.apis);

    expect(chrome.registered.get(CONTENT_SCRIPT_ID)?.persistAcrossSessions).toBe(true);
  });

  it("registers nothing when no site is allowed", async () => {
    const chrome = createFakeChrome();

    expect(await reconcileRegistrations(chrome.apis)).toBe("unchanged");
    expect(chrome.registered.size).toBe(0);
  });

  it("stays in sync end to end with the allowed-sites store (startup, add, remove)", async () => {
    const chrome = createFakeChrome();
    const sites = createAllowedSites(chrome.apis);
    // What the background does: reconcile on every permission change.
    chrome.apis.permissions.onAdded.addListener(() => void reconcileRegistrations(chrome.apis));
    chrome.apis.permissions.onRemoved.addListener(() => void reconcileRegistrations(chrome.apis));

    await sites.addPreset("nofluffjobs");
    await flush();
    expect(chrome.registered.get(CONTENT_SCRIPT_ID)?.matches).toEqual([
      "https://nofluffjobs.com/*",
    ]);

    await sites.removeSite("https://nofluffjobs.com/*");
    await flush();
    expect(chrome.registered.size).toBe(0);
  });
});

describe("injectIntoOpenTabs", () => {
  it("injects into already-open tabs on the newly granted origins only", async () => {
    const chrome = createFakeChrome({
      tabs: [
        { id: 1, url: "https://www.pracuj.pl/praca/x" },
        { id: 2, url: "https://www.linkedin.com/jobs/view/1" },
        { id: 3, url: "http://www.pracuj.pl/" },
        { id: 4 },
        { url: "https://www.pracuj.pl/no-id" },
      ],
    });

    const injected = await injectIntoOpenTabs(chrome.apis, ["https://*.pracuj.pl/*"]);

    expect(injected).toBe(1);
    expect(chrome.injections).toEqual([{ target: { tabId: 1 }, files: [CONTENT_SCRIPT_FILE] }]);
  });

  it("skips non-site origins and doesn't query tabs for them", async () => {
    const chrome = createFakeChrome({ tabs: [{ id: 1, url: "https://www.pracuj.pl/" }] });

    expect(await injectIntoOpenTabs(chrome.apis, ["https://*/*", "<all_urls>"])).toBe(0);
    expect(chrome.injections).toEqual([]);
  });

  it("keeps going when one tab can't be injected", async () => {
    const chrome = createFakeChrome({
      tabs: [
        { id: 1, url: "https://www.pracuj.pl/a" },
        { id: 2, url: "https://www.pracuj.pl/b" },
      ],
    });
    chrome.state.failingTabs.add(1);

    expect(await injectIntoOpenTabs(chrome.apis, ["https://*.pracuj.pl/*"])).toBe(1);
  });
});

describe("content script entry and built manifest", () => {
  // Under the WXT Vitest plugin import.meta.url isn't a file URL; tests run from the repo root
  // (workspace) or the extension package.
  const extensionRoot = existsSync(join(process.cwd(), "extension", "wxt.config.ts"))
    ? join(process.cwd(), "extension")
    : process.cwd();

  it("is registered at runtime only, with a guard against running twice", () => {
    const source = readFileSync(
      join(extensionRoot, "src", "entrypoints", "job-ad.content.ts"),
      "utf8",
    );

    expect(source).toContain('registration: "runtime"');
    expect(source).toMatch(/matches:\s*\[\]/);
    expect(source).toContain("__cvSnapJobAdLoaded");
  });

  const manifestPath = join(extensionRoot, ".output", "chrome-mv3", "manifest.json");
  it.runIf(existsSync(manifestPath))(
    "the last production build declares no host permissions and no static content scripts",
    () => {
      const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as Record<string, unknown>;

      expect(manifest.host_permissions).toBeUndefined();
      expect(manifest.content_scripts).toBeUndefined();
      expect(manifest.optional_host_permissions).toEqual(["https://*/*"]);
      expect(existsSync(join(extensionRoot, ".output", "chrome-mv3", CONTENT_SCRIPT_FILE))).toBe(
        true,
      );
    },
  );
});

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
