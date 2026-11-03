import { ArrowLeft, ExternalLink, FileText, Globe, Search, Trash2 } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useStore } from "zustand";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/field";
import { dateFormatter } from "@/lib/date-format";
import { useLanguage, useT } from "@/lib/i18n/i18n";
import type { HistoryEntry } from "./history-entry";
import { SentStatus } from "./SentStatus";
import { HISTORY_FILTERS, visibleEntries, type HistoryFilter, type HistoryStore } from "./store";

/** What a History row can open (story 001); the panel passes the real implementations. */
export interface HistoryActions {
  openPdf(adKey: string): Promise<unknown>;
  openPage(adKey: string): Promise<unknown>;
  openUrl(url: string): Promise<unknown>;
}

export interface HistoryViewProps {
  store: HistoryStore;
  actions: HistoryActions;
  onBack: () => void;
  /** From the Generate view's hint: scroll to this entry and focus it. */
  focusAdKey?: string | null;
}

/**
 * Rows rendered at first, and added by each "Show more" (NFR: 500 entries open in < 500 ms; all
 * 500 rows took 0.5–0.9 s in Chromium). Search and filter always cover every entry.
 */
export const HISTORY_PAGE_SIZE = 50;

/** Element id of a row, for the hint's "Show in history" link. */
export const historyRowId = (adKey: string) => `history-${encodeURIComponent(adKey)}`;

const FILTER_LABELS = {
  all: "history_filter_all",
  sent: "history_filter_sent",
  "not-sent": "history_filter_not_sent",
} as const;

/** Company, else the ad's host, else "Untitled ad". */
function adName(entry: HistoryEntry, untitled: string): string {
  if (entry.company) return entry.company;
  if (entry.url) {
    try {
      return new URL(entry.url).hostname;
    } catch {
      // fall through
    }
  }
  return untitled;
}

/**
 * The History view (story 001-history-tab): every downloaded CV on this PC, newest first, with
 * search, a sent filter, and actions per entry. Lazy-loaded from the panel header.
 */
export default function HistoryView({ store, actions, onBack, focusAdKey }: HistoryViewProps) {
  const t = useT();
  const status = useStore(store, (state) => state.status);
  const entries = useStore(store, (state) => state.entries);
  const unreadable = useStore(store, (state) => state.unreadable);
  const query = useStore(store, (state) => state.query);
  const filter = useStore(store, (state) => state.filter);
  const searchId = useId();
  const filterId = useId();
  const [toDelete, setToDelete] = useState<HistoryEntry | null>(null);
  const [isFailed, setIsFailed] = useState(false);

  useEffect(() => {
    void store.getState().load();
  }, [store]);

  const matching = useMemo(() => visibleEntries(entries, query, filter), [entries, query, filter]);
  const [limit, setLimit] = useState(HISTORY_PAGE_SIZE);
  // A new search or filter starts at the first page again.
  useEffect(() => {
    setLimit(HISTORY_PAGE_SIZE);
  }, [query, filter]);
  // The entry the hint asked for is always rendered, however far down it is.
  const focusIndex = focusAdKey ? matching.findIndex((entry) => entry.adKey === focusAdKey) : -1;
  const shown = matching.slice(0, Math.max(limit, focusIndex + 1));
  const hidden = matching.length - shown.length;

  const run = (action: () => Promise<unknown>) => {
    setIsFailed(false);
    action().catch(() => {
      setIsFailed(true);
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft aria-hidden="true" />
          {t("action_back")}
        </Button>
        <h2 className="text-base font-semibold">{t("history_title")}</h2>
      </div>
      <p className="text-sm text-muted-foreground">{t("history_note")}</p>

      {status === "failed" ? (
        <Alert variant="destructive">
          <AlertDescription>{t("history_load_failed")}</AlertDescription>
        </Alert>
      ) : null}
      {unreadable > 0 ? (
        <p className="text-sm text-muted-foreground">
          {t("history_unreadable", String(unreadable))}
        </p>
      ) : null}
      {isFailed ? (
        <p role="alert" className="text-sm">
          {t("history_action_failed")}
        </p>
      ) : null}

      {status === "ready" && entries.length === 0 ? (
        <p className="text-sm">{t("history_empty")}</p>
      ) : null}

      {entries.length > 0 ? (
        <>
          <div className="flex flex-wrap items-end gap-2">
            <div className="flex min-w-40 flex-1 flex-col gap-1">
              <Label htmlFor={searchId}>{t("history_search")}</Label>
              <div className="relative">
                <Search
                  aria-hidden="true"
                  className="absolute top-2.5 left-2 size-4 text-muted-foreground"
                />
                <Input
                  id={searchId}
                  type="search"
                  className="pl-8"
                  value={query}
                  onChange={(event) => {
                    store.getState().setQuery(event.target.value);
                  }}
                />
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor={filterId}>{t("history_filter")}</Label>
              <Select
                id={filterId}
                value={filter}
                onChange={(event) => {
                  store.getState().setFilter(event.target.value as HistoryFilter);
                }}
              >
                {HISTORY_FILTERS.map((value) => (
                  <option key={value} value={value}>
                    {t(FILTER_LABELS[value])}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          {matching.length === 0 ? (
            <div className="flex flex-wrap items-center gap-2 text-sm">
              {t("history_no_match")}
              <Button
                size="sm"
                variant="link"
                className="h-auto p-0"
                onClick={() => {
                  store.getState().setQuery("");
                  store.getState().setFilter("all");
                }}
              >
                {t("history_clear_search")}
              </Button>
            </div>
          ) : (
            <ul className="flex flex-col gap-2">
              {shown.map((entry) => (
                <HistoryRow
                  key={entry.adKey}
                  entry={entry}
                  store={store}
                  isFocused={entry.adKey === focusAdKey}
                  onOpenPdf={() => {
                    run(() => actions.openPdf(entry.adKey));
                  }}
                  onOpenPage={() => {
                    run(() => actions.openPage(entry.adKey));
                  }}
                  onOpenAd={
                    entry.url
                      ? () => {
                          const url = entry.url;
                          if (url) run(() => actions.openUrl(url));
                        }
                      : null
                  }
                  onDelete={() => {
                    setToDelete(entry);
                  }}
                />
              ))}
            </ul>
          )}
          {hidden > 0 ? (
            <Button
              variant="outline"
              size="sm"
              className="self-start"
              onClick={() => {
                setLimit((current) => current + HISTORY_PAGE_SIZE);
              }}
            >
              {t("history_show_more", String(Math.min(hidden, HISTORY_PAGE_SIZE)), String(hidden))}
            </Button>
          ) : null}
        </>
      ) : null}

      <AlertDialog
        open={toDelete !== null}
        onOpenChange={(isOpen) => {
          if (!isOpen) setToDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogTitle>{t("history_delete_title")}</AlertDialogTitle>
          <AlertDialogDescription>
            {toDelete
              ? t(
                  "history_delete_description",
                  [toDelete.title, adName(toDelete, t("history_untitled"))]
                    .filter(Boolean)
                    .join(", "),
                )
              : null}
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("history_delete_keep")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const entry = toDelete;
                if (entry) run(() => store.getState().remove(entry.adKey));
              }}
            >
              {t("history_delete_confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

interface HistoryRowProps {
  entry: HistoryEntry;
  store: HistoryStore;
  isFocused: boolean;
  onOpenPdf: () => void;
  onOpenPage: () => void;
  onOpenAd: (() => void) | null;
  onDelete: () => void;
}

function HistoryRow({
  entry,
  store,
  isFocused,
  onOpenPdf,
  onOpenPage,
  onOpenAd,
  onDelete,
}: HistoryRowProps) {
  const t = useT();
  const { language } = useLanguage();
  const ref = useRef<HTMLLIElement>(null);
  const nameId = useId();
  const name = adName(entry, t("history_untitled"));
  const downloaded = dateFormatter(language, "medium").format(new Date(entry.lastDownloadedAt));

  useEffect(() => {
    if (!isFocused) return;
    ref.current?.scrollIntoView({ block: "center" });
    ref.current?.focus();
  }, [isFocused]);

  return (
    <li
      ref={ref}
      id={historyRowId(entry.adKey)}
      tabIndex={-1}
      className="flex flex-col gap-2 rounded-md border p-3 focus-visible:outline-2"
    >
      <div className="flex flex-col">
        <span id={nameId} className="font-medium">
          {name}
        </span>
        {entry.title ? <span className="text-sm">{entry.title}</span> : null}
        <span className="text-xs text-muted-foreground">
          {t("history_downloaded_on", downloaded)}
        </span>
      </div>
      <SentStatus entry={entry} store={store} />
      <div className="flex flex-wrap gap-1">
        <Button size="sm" variant="outline" onClick={onOpenPdf} aria-describedby={nameId}>
          <FileText aria-hidden="true" />
          {t("history_open_pdf")}
        </Button>
        <Button size="sm" variant="outline" onClick={onOpenPage} aria-describedby={nameId}>
          <Globe aria-hidden="true" />
          {t("history_open_page")}
        </Button>
        {onOpenAd ? (
          <Button size="sm" variant="outline" onClick={onOpenAd} aria-describedby={nameId}>
            <ExternalLink aria-hidden="true" />
            {t("history_open_ad")}
          </Button>
        ) : null}
        <Button size="sm" variant="ghost" onClick={onDelete} aria-describedby={nameId}>
          <Trash2 aria-hidden="true" />
          {t("history_delete")}
        </Button>
      </div>
    </li>
  );
}
