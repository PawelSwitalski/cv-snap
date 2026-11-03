import { useEffect, useState } from "react";
import { useLanguage, useT } from "@/lib/i18n/i18n";
import type { HistoryEntry } from "./history-entry";
import type { HistoryRepository } from "./history-repository";

/**
 * Sandbox of the saved page (story 004-open-saved-files): no `allow-scripts`, no
 * `allow-same-origin`, so page code can't run and the frame has a unique origin without any
 * `chrome.*` access. Links may open in a new tab, outside the sandbox.
 */
export const SAVED_PAGE_SANDBOX = "allow-popups allow-popups-to-escape-sandbox";

type Loaded =
  | { kind: "loading" }
  | { kind: "deleted" }
  | { kind: "page"; entry: HistoryEntry; html: string }
  | { kind: "text"; entry: HistoryEntry; text: string };

async function load(history: HistoryRepository, adKey: string): Promise<Loaded> {
  const entry = adKey === "" ? null : await history.get(adKey);
  if (!entry) return { kind: "deleted" };
  const html = entry.snapshot === "saved" ? await history.getSnapshot(adKey) : null;
  if (html !== null) return { kind: "page", entry, html };
  return { kind: "text", entry, text: (await history.getAdText(adKey)) ?? "" };
}

/** A saved job-ad page, or its ad text when no copy of the page was kept. */
export function SavedPage({ adKey, history }: { adKey: string; history: HistoryRepository }) {
  const t = useT();
  const { language } = useLanguage();
  const [loaded, setLoaded] = useState<Loaded>({ kind: "loading" });

  useEffect(() => {
    let isCurrent = true;
    load(history, adKey).then(
      (result) => {
        if (isCurrent) setLoaded(result);
      },
      () => {
        if (isCurrent) setLoaded({ kind: "deleted" });
      },
    );
    return () => {
      isCurrent = false;
    };
  }, [history, adKey]);

  useEffect(() => {
    document.title = t("history_page_title");
  }, [t]);

  if (loaded.kind === "loading") return null;
  if (loaded.kind === "deleted") {
    return <p className="p-4 text-sm">{t("history_page_deleted")}</p>;
  }

  const { entry } = loaded;
  const date = new Intl.DateTimeFormat(language, { dateStyle: "long" }).format(
    new Date(entry.lastDownloadedAt),
  );
  return (
    <div className="flex h-screen flex-col">
      <header className="border-b bg-muted px-4 py-2 text-sm">
        {entry.url
          ? t("history_page_banner", date, entry.url)
          : t("history_page_banner_no_url", date)}
      </header>
      {loaded.kind === "page" ? (
        <iframe
          className="w-full flex-1 border-0 bg-white"
          sandbox={SAVED_PAGE_SANDBOX}
          srcDoc={loaded.html}
          title={t("history_page_title")}
        />
      ) : (
        <main className="flex flex-col gap-3 overflow-auto p-4">
          <p className="text-sm text-muted-foreground">
            {entry.snapshot === "too-large"
              ? t("history_page_too_large")
              : t("history_page_text_only")}
          </p>
          <pre className="text-sm whitespace-pre-wrap">{loaded.text}</pre>
        </main>
      )}
    </div>
  );
}
