import { CheckCircle2, Send, Undo2 } from "lucide-react";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";
import { dateFormatter } from "@/lib/date-format";
import { useLanguage, useT } from "@/lib/i18n/i18n";
import type { HistoryEntry } from "./history-entry";
import { todayLocal, type HistoryStore } from "./store";

/** A `YYYY-MM-DD` calendar date in the UI language, e.g. "3 November 2026". */
export function formatCalendarDate(date: string, language: string): string {
  const [year, month, day] = date.split("-").map(Number);
  return dateFormatter(language, "long").format(new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1));
}

/**
 * Sent or not sent, with the date (story 002-mark-as-sent). Used in a History row and in the
 * Generate view after Download PDF.
 */
export function SentStatus({ entry, store }: { entry: HistoryEntry; store: HistoryStore }) {
  const t = useT();
  const { language } = useLanguage();
  const dateId = useId();
  const [isFailed, setIsFailed] = useState(false);
  const today = todayLocal();

  const update = (sentOn: string | null) => {
    setIsFailed(false);
    store
      .getState()
      .setSentOn(entry.adKey, sentOn)
      .catch(() => {
        setIsFailed(true);
      });
  };

  if (entry.sentOn === null) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground">{t("sent_not_sent")}</span>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            update(today);
          }}
        >
          <Send aria-hidden="true" />
          {t("sent_mark")}
        </Button>
        {isFailed ? <span role="alert">{t("history_action_failed")}</span> : null}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="flex items-center gap-1 text-sm">
        <CheckCircle2 aria-hidden="true" className="size-4" />
        {t("sent_on", formatCalendarDate(entry.sentOn, language))}
      </span>
      <Label htmlFor={dateId} className="sr-only">
        {t("sent_date_label")}
      </Label>
      <Input
        id={dateId}
        type="date"
        className="h-8 w-auto"
        max={today}
        value={entry.sentOn}
        onChange={(event) => {
          const value = event.target.value;
          // The picker honours `max`; typed dates are checked here too.
          if (/^\d{4}-\d{2}-\d{2}$/.test(value) && value <= today) update(value);
        }}
      />
      <Button
        size="sm"
        variant="ghost"
        onClick={() => {
          update(null);
        }}
      >
        <Undo2 aria-hidden="true" />
        {t("sent_unmark")}
      </Button>
      {isFailed ? <span role="alert">{t("history_action_failed")}</span> : null}
    </div>
  );
}
