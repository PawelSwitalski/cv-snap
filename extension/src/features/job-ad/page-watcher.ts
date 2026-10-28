import { scoreJobAd } from "./detect";
import type { JobAdStatusMessage } from "./messages";

/** Lazily loaded ads: re-score once the DOM has been quiet this long. */
export const RESCORE_DEBOUNCE_MS = 750;
/** SPA navigation: content scripts can't hook the page's `history.pushState`, so poll the URL. */
export const URL_POLL_MS = 1000;

export interface WatcherEnvironment {
  document: Document;
  getUrl(): string;
  send(message: JobAdStatusMessage): void;
  setTimeout(callback: () => void, ms: number): number;
  clearTimeout(id: number): void;
  setInterval(callback: () => void, ms: number): number;
  addWindowListener(type: "popstate" | "hashchange", callback: () => void): void;
  observeMutations(callback: () => void): () => void;
}

/**
 * Keeps the background informed about whether the current page is a job ad (story 003): scores on
 * start, after DOM changes (debounced) and on URL changes (polling + popstate/hashchange), and sends
 * a status message only when the result or the URL changes.
 */
export function startPageWatcher(env: WatcherEnvironment): { stop(): void; rescore(): void } {
  let last: { isJobAd: boolean; url: string } | null = null;
  let debounce: number | null = null;
  let polledUrl = env.getUrl();

  const rescore = () => {
    const url = env.getUrl();
    const { isJobAd } = scoreJobAd({ url, document: env.document });
    if (last?.isJobAd === isJobAd && last.url === url) return;
    last = { isJobAd, url };
    env.send({ type: "job-ad-status", isJobAd, url });
  };
  const scheduleRescore = () => {
    if (debounce !== null) env.clearTimeout(debounce);
    debounce = env.setTimeout(() => {
      debounce = null;
      rescore();
    }, RESCORE_DEBOUNCE_MS);
  };
  const onUrlMaybeChanged = () => {
    const url = env.getUrl();
    if (url === polledUrl) return;
    polledUrl = url;
    rescore();
  };

  const stopObserving = env.observeMutations(scheduleRescore);
  env.setInterval(onUrlMaybeChanged, URL_POLL_MS);
  env.addWindowListener("popstate", onUrlMaybeChanged);
  env.addWindowListener("hashchange", onUrlMaybeChanged);
  rescore();

  return {
    stop() {
      stopObserving();
      if (debounce !== null) env.clearTimeout(debounce);
    },
    rescore,
  };
}
