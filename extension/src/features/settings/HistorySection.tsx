import { Trash2 } from "lucide-react";
import { useEffect, useId, useMemo, useState } from "react";
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
import { Button } from "@/components/ui/button";
import { Label, Select } from "@/components/ui/field";
import { expiredEntries, historyUsage, retentionCutoff } from "@/features/history/retention";
import type { HistoryStore } from "@/features/history/store";
import { dateFormatter } from "@/lib/date-format";
import { useLanguage, useT } from "@/lib/i18n/i18n";
import { MAX_RETENTION_MONTHS, MIN_RETENTION_MONTHS, type HistoryRetention } from "./settings";
import { SettingsSection } from "./SettingsSection";
import type { SettingsStore } from "./store";

export interface HistorySectionDeps {
  settings: SettingsStore;
  history: HistoryStore;
  now?: () => Date;
}

const MONTH_OPTIONS = Array.from(
  { length: MAX_RETENTION_MONTHS - MIN_RETENTION_MONTHS + 1 },
  (_, index) => MIN_RETENTION_MONTHS + index,
);

/** Default when switching from "forever" to a period. */
const DEFAULT_MONTHS = 12;

/** Size for people: "0.4 MB", "12 MB" (one decimal below 10 MB). */
function megabytes(bytes: number, language: string): string {
  const mb = bytes / (1024 * 1024);
  return new Intl.NumberFormat(language, { maximumFractionDigits: mb < 10 ? 1 : 0 }).format(mb);
}

/**
 * Settings → History (story 004-retention-setting): how long CVs are kept, what the history uses,
 * and "Delete all history". A shorter period that would delete entries asks first.
 */
export function HistorySection({ deps }: { deps: HistorySectionDeps }) {
  const t = useT();
  const { language } = useLanguage();
  const retention = useStore(deps.settings, (state) => state.historyRetention);
  const entries = useStore(deps.history, (state) => state.entries);
  const name = useId();
  const monthsId = useId();
  const [pending, setPending] = useState<{ retention: HistoryRetention; count: number } | null>(
    null,
  );
  const [isClearOpen, setIsClearOpen] = useState(false);
  const [isFailed, setIsFailed] = useState(false);
  const now = deps.now ?? (() => new Date());
  const usage = useMemo(() => historyUsage(entries), [entries]);

  // Fresh numbers whenever Settings opens.
  useEffect(() => {
    void deps.history.getState().load();
  }, [deps.history]);

  const apply = (next: HistoryRetention) => {
    deps.settings.getState().setHistoryRetention(next);
    setIsFailed(false);
    deps.history
      .getState()
      .prune(next, now())
      .catch(() => {
        setIsFailed(true);
      });
  };

  const choose = (next: HistoryRetention) => {
    const count = expiredEntries(entries, next, now()).length;
    if (count > 0) setPending({ retention: next, count });
    else apply(next);
  };

  const months = retention.mode === "months" ? retention.months : DEFAULT_MONTHS;
  const cutoff = pending ? retentionCutoff(pending.retention, now()) : null;

  return (
    <SettingsSection heading="history_title">
      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm">{t("settings_history_keep")}</legend>
        <div className="flex items-center gap-2">
          <input
            id={`${name}-forever`}
            type="radio"
            name={name}
            className="size-4 accent-primary"
            checked={retention.mode === "forever"}
            onChange={() => {
              choose({ mode: "forever" });
            }}
          />
          <Label htmlFor={`${name}-forever`}>{t("settings_history_forever")}</Label>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            id={`${name}-months`}
            type="radio"
            name={name}
            className="size-4 accent-primary"
            checked={retention.mode === "months"}
            aria-describedby={monthsId}
            onChange={() => {
              choose({ mode: "months", months });
            }}
          />
          <Label htmlFor={`${name}-months`}>{t("settings_history_months")}</Label>
          <Select
            id={monthsId}
            aria-label={t("settings_history_months_count")}
            className="w-auto"
            value={String(months)}
            disabled={retention.mode !== "months"}
            onChange={(event) => {
              choose({ mode: "months", months: Number(event.currentTarget.value) });
            }}
          >
            {MONTH_OPTIONS.map((value) => (
              <option key={value} value={value}>
                {t("settings_history_months_option", String(value))}
              </option>
            ))}
          </Select>
        </div>
      </fieldset>

      <p className="text-sm text-muted-foreground">
        {t("settings_history_usage", String(usage.count), megabytes(usage.bytes, language))}
      </p>
      {isFailed ? (
        <p role="alert" className="text-sm">
          {t("history_action_failed")}
        </p>
      ) : null}
      <Button
        variant="outline"
        size="sm"
        className="self-start"
        disabled={usage.count === 0}
        onClick={() => {
          setIsClearOpen(true);
        }}
      >
        <Trash2 aria-hidden="true" />
        {t("settings_history_clear")}
      </Button>

      <AlertDialog
        open={pending !== null}
        onOpenChange={(isOpen) => {
          if (!isOpen) setPending(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogTitle>{t("settings_history_shorten_title")}</AlertDialogTitle>
          <AlertDialogDescription>
            {pending && cutoff
              ? t(
                  "settings_history_shorten_description",
                  String(pending.count),
                  dateFormatter(language, "long").format(cutoff),
                )
              : null}
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("settings_history_shorten_keep")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pending) apply(pending.retention);
                setPending(null);
              }}
            >
              {t("settings_history_shorten_confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isClearOpen} onOpenChange={setIsClearOpen}>
        <AlertDialogContent>
          <AlertDialogTitle>{t("settings_history_clear_title")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("settings_history_clear_description", String(usage.count))}
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("history_delete_keep")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setIsFailed(false);
                deps.history
                  .getState()
                  .clearAll()
                  .catch(() => {
                    setIsFailed(true);
                  });
              }}
            >
              {t("settings_history_clear_confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SettingsSection>
  );
}
