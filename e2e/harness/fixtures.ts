import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { DEV_EXTENSION_ID } from "@cv-snap/shared";
import {
  chromium,
  test as base,
  type BrowserContext,
  type Page,
  type Worker,
} from "@playwright/test";
import { registerHost } from "./host-registration";
import { startJobBoard, type JobBoard } from "./job-board";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
export const FIXTURES_DIR = join(ROOT, "e2e", "fixtures");
const EXTENSION_DIR = join(ROOT, "extension", ".output", "chrome-mv3-e2e");
const HOST_SCRIPT = join(ROOT, "native-host", "dist", "cv-snap-host.mjs");

/** `chrome.storage.local` key of the confirmed profile (`STORAGE_KEYS.activeProfile`). */
const ACTIVE_PROFILE_KEY = "profile.active";

export interface CvSnap {
  context: BrowserContext;
  serviceWorker: Worker;
  extensionId: string;
  /**
   * Opens the real side panel next to `tab` and returns it as a page. Playwright doesn't list side
   * panels, so the panel is opened with a trusted click in an extension tab (`sidePanel.open` needs
   * a user gesture) and reached over a second CDP connection (spike, bolt 022).
   */
  openSidePanel(tab: Page): Promise<Page>;
}

/**
 * What a test starts with: the helper registered for the test browser, and a confirmed profile.
 * The history-only test (intent 005) turns both off to be a user without the helper.
 */
export interface CvSnapSetup {
  host: boolean;
  profile: boolean;
}

async function waitForDevToolsPort(userDataDir: string): Promise<number> {
  const file = join(userDataDir, "DevToolsActivePort");
  for (let attempt = 0; attempt < 100; attempt++) {
    try {
      const port = Number(readFileSync(file, "utf8").split("\n")[0]);
      if (port > 0) return port;
    } catch {
      // not written yet
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("Chromium didn't write DevToolsActivePort");
}

export const test = base.extend<
  { cvSnapSetup: CvSnapSetup; cvSnap: CvSnap },
  { jobBoard: JobBoard }
>({
  cvSnapSetup: [{ host: true, profile: true }, { option: true }],

  jobBoard: [
    // Playwright reads the fixture's dependencies from this destructuring; there are none.
    // eslint-disable-next-line no-empty-pattern
    async ({}, use) => {
      const board = await startJobBoard(FIXTURES_DIR);
      await use(board);
      await board.close();
    },
    { scope: "worker" },
  ],

  cvSnap: async ({ jobBoard, cvSnapSetup }, use) => {
    const workDir = mkdtempSync(join(tmpdir(), "cvsnap-e2e-"));
    const userDataDir = join(workDir, "profile");
    const registration = cvSnapSetup.host
      ? registerHost({
          platform: process.platform,
          workDir: join(workDir, "host"),
          userDataDir,
          nodePath: process.execPath,
          hostScript: HOST_SCRIPT,
          fixturesDir: join(FIXTURES_DIR, "provider"),
          extensionId: DEV_EXTENSION_ID,
        })
      : null;
    let context: BrowserContext | undefined;
    const remotes: { close(): Promise<void> }[] = [];
    try {
      context = await chromium.launchPersistentContext(userDataDir, {
        channel: "chromium",
        acceptDownloads: true,
        // The tests read English UI text; Chromium would otherwise follow the system language.
        locale: "en-US",
        args: [
          "--lang=en-US",
          `--disable-extensions-except=${EXTENSION_DIR}`,
          `--load-extension=${EXTENSION_DIR}`,
          "--remote-debugging-port=0",
          ...jobBoard.chromiumArgs,
        ],
      });
      const serviceWorker =
        context.serviceWorkers()[0] ?? (await context.waitForEvent("serviceworker"));
      const extensionId = new URL(serviceWorker.url()).host;
      // The job board's content script is registered at install; a page opened before that has
      // none. Seeding a profile used to hide this race (bolt 030).
      for (let attempt = 0; ; attempt++) {
        const registered = await serviceWorker.evaluate(
          async () => (await chrome.scripting.getRegisteredContentScripts()).length,
        );
        if (registered > 0) break;
        if (attempt >= 100) throw new Error("the job-ad content script wasn't registered");
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      if (cvSnapSetup.profile) {
        const profile: unknown = JSON.parse(
          readFileSync(join(FIXTURES_DIR, "provider", "profile.json"), "utf8"),
        );
        await serviceWorker.evaluate(([key, value]) => chrome.storage.local.set({ [key]: value }), [
          ACTIVE_PROFILE_KEY,
          profile,
        ] as const);
      }

      const port = await waitForDevToolsPort(userDataDir);
      const browserContext = context;
      await use({
        context,
        serviceWorker,
        extensionId,
        async openSidePanel(tab) {
          await tab.bringToFront();
          const tabId = await serviceWorker.evaluate(async () => {
            const [active] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
            return active?.id;
          });
          if (tabId === undefined) throw new Error("no active tab");

          const helper = await browserContext.newPage();
          await helper.goto(`chrome-extension://${extensionId}/sidepanel.html`);
          await helper.evaluate((id) => {
            const button = document.createElement("button");
            button.id = "e2e-open-side-panel";
            button.style.cssText = "position:fixed;inset:0;z-index:2147483647;opacity:0";
            button.addEventListener("click", () => {
              void chrome.sidePanel.open({ tabId: id });
            });
            document.body.append(button);
          }, tabId);
          await helper.click("#e2e-open-side-panel");
          await helper.close();
          await tab.bringToFront();

          const remote = await chromium.connectOverCDP(`http://127.0.0.1:${String(port)}`);
          remotes.push(remote);
          for (let attempt = 0; attempt < 50; attempt++) {
            for (const page of remote.contexts().flatMap((c) => c.pages())) {
              if (!page.url().endsWith("/sidepanel.html")) continue;
              // The side panel isn't a tab; a sidepanel.html tab would return its own tab here.
              const isPanel = await page.evaluate(async () => !(await chrome.tabs.getCurrent()));
              if (isPanel) return page;
            }
            await new Promise((resolve) => setTimeout(resolve, 100));
          }
          throw new Error("side panel didn't open");
        },
      });
    } finally {
      for (const remote of remotes) await remote.close().catch(() => undefined);
      await context?.close();
      registration?.remove();
      rmSync(workDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
    }
  },
});

export { expect } from "@playwright/test";
