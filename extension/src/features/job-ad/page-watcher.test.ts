import { describe, expect, it } from "vitest";
import { adPageHtml, loadPage } from "../../../test/job-ad-fixtures";
import type { JobAdStatusMessage } from "./messages";
import { RESCORE_DEBOUNCE_MS, startPageWatcher, URL_POLL_MS } from "./page-watcher";

/** Manual clock + recorded listeners standing in for the content script's environment. */
function fakeEnvironment(html: string, url = "https://jobs.example.com/offer/1") {
  const sent: JobAdStatusMessage[] = [];
  const timers = new Map<number, { at: number; callback: () => void }>();
  const intervals: { every: number; callback: () => void; next: number }[] = [];
  const windowListeners = new Map<string, () => void>();
  let mutationCallback: (() => void) | null = null;
  let isObserving = false;
  let now = 0;
  let nextId = 1;
  let currentUrl = url;
  const document = loadPage(html);

  const watcher = startPageWatcher({
    document,
    getUrl: () => currentUrl,
    send: (message) => sent.push(message),
    setTimeout: (callback, ms) => {
      const id = nextId++;
      timers.set(id, { at: now + ms, callback });
      return id;
    },
    clearTimeout: (id) => {
      timers.delete(id);
    },
    setInterval: (callback, ms) => {
      intervals.push({ every: ms, callback, next: now + ms });
      return nextId++;
    },
    addWindowListener: (type, callback) => {
      windowListeners.set(type, callback);
    },
    observeMutations: (callback) => {
      mutationCallback = callback;
      isObserving = true;
      return () => {
        isObserving = false;
      };
    },
  });

  const advance = (ms: number) => {
    const until = now + ms;
    for (;;) {
      const due = [
        ...[...timers.entries()].map(([id, t]) => ({
          at: t.at,
          run: () => {
            timers.delete(id);
            t.callback();
          },
        })),
        ...intervals.map((i) => ({
          at: i.next,
          run: () => {
            i.next += i.every;
            i.callback();
          },
        })),
      ]
        .filter((entry) => entry.at <= until)
        .sort((a, b) => a.at - b.at)[0];
      if (!due) break;
      now = due.at;
      due.run();
    }
    now = until;
  };

  return {
    document,
    sent,
    watcher,
    advance,
    mutate: () => mutationCallback?.(),
    navigate: (to: string) => {
      currentUrl = to;
    },
    fire: (type: string) => windowListeners.get(type)?.(),
    isObserving: () => isObserving,
    pendingTimers: () => timers.size,
  };
}

const LISTING = "<html><body><h1>Blog</h1><p>Nothing to see</p></body></html>";

describe("startPageWatcher", () => {
  it("reports the status once on start", () => {
    const env = fakeEnvironment(adPageHtml());

    expect(env.sent).toEqual([
      { type: "job-ad-status", isJobAd: true, url: "https://jobs.example.com/offer/1" },
    ]);
  });

  it("re-scores after DOM changes settle (debounced) and reports only real changes", () => {
    const env = fakeEnvironment(LISTING);
    env.sent.length = 0;

    // A lazily loaded ad appears; several mutations in a row collapse into one re-score.
    loadPage(adPageHtml());
    env.mutate();
    env.advance(RESCORE_DEBOUNCE_MS - 1);
    env.mutate();
    env.advance(RESCORE_DEBOUNCE_MS - 1);
    expect(env.sent).toEqual([]);
    env.advance(1);

    expect(env.sent).toEqual([
      { type: "job-ad-status", isJobAd: true, url: "https://jobs.example.com/offer/1" },
    ]);

    // Another mutation with the same outcome sends nothing new.
    env.mutate();
    env.advance(RESCORE_DEBOUNCE_MS);
    expect(env.sent).toHaveLength(1);
  });

  it("notices in-app (SPA) navigation by polling the URL", () => {
    const env = fakeEnvironment(adPageHtml());
    env.sent.length = 0;

    loadPage(LISTING);
    env.navigate("https://jobs.example.com/search?q=java");
    env.advance(URL_POLL_MS);

    expect(env.sent).toEqual([
      { type: "job-ad-status", isJobAd: false, url: "https://jobs.example.com/search?q=java" },
    ]);
  });

  it.each(["popstate", "hashchange"])("re-scores at once on %s", (event) => {
    const env = fakeEnvironment(adPageHtml());
    env.sent.length = 0;

    env.navigate("https://jobs.example.com/offer/2");
    env.fire(event);

    expect(env.sent).toEqual([
      { type: "job-ad-status", isJobAd: true, url: "https://jobs.example.com/offer/2" },
    ]);
  });

  it("stops observing and cancels a pending re-score on stop", () => {
    const env = fakeEnvironment(adPageHtml());
    env.mutate();

    env.watcher.stop();

    expect(env.isObserving()).toBe(false);
    expect(env.pendingTimers()).toBe(0);
  });
});
