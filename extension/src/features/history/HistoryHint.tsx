import { History } from "lucide-react";
import { useEffect, useState } from "react";
import { useStore } from "zustand";
import { Button } from "@/components/ui/button";
import type { PageState } from "@/features/generate/page-state";
import { useLanguage, useT } from "@/lib/i18n/i18n";
import { entrySource } from "./history-entry";
import { formatCalendarDate } from "./SentStatus";
import { todayLocal, type HistoryStore } from "./store";

/** Waits for the tab to settle (SPA navigation fires several changes) before reading the ad. */
export const HINT_DEBOUNCE_MS = 300;

/**
 * The `AdKey` of the ad in the tab next to the panel, read without a page snapshot (story
 * 003-already-in-history-hint); null when no ad is detected or it can't be read.
 */
export function usePageAdKey(
  pageState: PageState,
  adKeyOfTab: (tabId: number) => Promise<string | null>,
): string | null {
  const [adKey, setAdKey] = useState<string | null>(null);
  const tabId = pageState.kind === "ad-detected" ? pageState.tabId : null;
  const url = pageState.kind === "ad-detected" ? pageState.url : null;

  useEffect(() => {
    setAdKey(null);
    if (tabId === null) return;
    let isCurrent = true;
    const timer = setTimeout(() => {
      adKeyOfTab(tabId).then(
        (key) => {
          if (isCurrent) setAdKey(key);
        },
        () => undefined,
      );
    }, HINT_DEBOUNCE_MS);
    return () => {
      isCurrent = false;
      clearTimeout(timer);
    };
    // `url` re-reads the ad after an in-page navigation of the same tab.
  }, [tabId, url, adKeyOfTab]);

  return adKey;
}

/**
 * "You downloaded a CV for this ad on …" (story 003), or "You saved your CV …" for the user's own
 * CV (intent 005); never blocks Generate.
 */
export function HistoryHint({
  store,
  adKey,
  onShow,
}: {
  store: HistoryStore;
  adKey: string | null;
  onShow: (adKey: string) => void;
}) {
  const t = useT();
  const { language } = useLanguage();
  const entry = useStore(store, (state) =>
    adKey === null ? undefined : state.entries.find((candidate) => candidate.adKey === adKey),
  );
  if (!entry) return null;

  const downloaded = formatCalendarDate(todayLocal(new Date(entry.lastDownloadedAt)), language);
  const isOwn = entrySource(entry) === "own";
  return (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
      <History aria-hidden="true" className="size-4" />
      {entry.sentOn
        ? t(
            isOwn ? "hint_own_sent" : "hint_sent",
            downloaded,
            formatCalendarDate(entry.sentOn, language),
          )
        : t(isOwn ? "hint_own_saved" : "hint_downloaded", downloaded)}
      <Button
        size="sm"
        variant="link"
        className="h-auto p-0"
        onClick={() => {
          onShow(entry.adKey);
        }}
      >
        {t("hint_show")}
      </Button>
    </p>
  );
}
