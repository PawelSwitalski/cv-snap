import { FilePlus2, History, Loader2, Save } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input, Label } from "@/components/ui/field";
import { validateCvFile, type CvFileProblem } from "@/features/cv-upload/validate-file";
import type { PageState } from "@/features/generate/page-state";
import { errorFixKey, errorMessageKey } from "@/lib/i18n/error-messages";
import { useLanguage, useT } from "@/lib/i18n/i18n";
import type { MessageKey } from "@/lib/i18n/messages";
import { logger } from "@/lib/logger";
import type { CaptureOwnCvAdResult } from "./capture-own-cv-ad";
import { entrySource } from "./history-entry";
import { ownCvDefaults, storedCvName, type OwnCvAd } from "./record-own-cv";
import type { HistoryStore } from "./store";

export interface SaveOwnCvDeps {
  /** The ad in a tab with its key and cleaned page; never touches the host. */
  captureAd: (tabId: number) => Promise<CaptureOwnCvAdResult>;
  /** The CV uploaded at setup (`cv-original`), if there is one. */
  storedCv: () => Promise<Blob | undefined>;
  store: HistoryStore;
  onShowEntry: (adKey: string) => void;
}

const FILE_PROBLEMS: Record<CvFileProblem, MessageKey> = {
  NOT_PDF: "upload_error_not_pdf",
  TOO_LARGE: "upload_error_too_large",
  EMPTY: "upload_error_empty",
};

interface Draft {
  ad: OwnCvAd;
  pdf: Blob;
  fileName: string;
  title: string;
  company: string;
}

type SaveState =
  | { kind: "idle" }
  | { kind: "capturing" }
  | { kind: "form"; draft: Draft }
  | { kind: "confirm-replace"; draft: Draft }
  | { kind: "saving"; draft: Draft }
  | { kind: "saved"; adKey: string }
  | { kind: "error"; message: MessageKey; fix?: MessageKey };

/**
 * Save my CV to history (stories 002 and 003, intent 005): the user's own CV, the stored one or a
 * picked PDF, saved for the ad in the tab with an editable job title and company. Works without
 * the helper: the ad comes from the content script and everything is stored in the extension.
 */
export function SaveOwnCv({ deps, pageState }: { deps: SaveOwnCvDeps; pageState: PageState }) {
  const t = useT();
  const { language } = useLanguage();
  const inputId = useId();
  const titleId = useId();
  const companyId = useId();
  const fileInput = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<SaveState>({ kind: "idle" });
  const [hasStoredCv, setHasStoredCv] = useState(false);

  const { storedCv } = deps;
  useEffect(() => {
    let isCurrent = true;
    storedCv().then(
      (file) => {
        if (isCurrent) setHasStoredCv(file !== undefined);
      },
      () => undefined,
    );
    return () => {
      isCurrent = false;
    };
  }, [storedCv]);

  const tabId =
    pageState.kind === "ad-detected" || pageState.kind === "no-ad" ? pageState.tabId : null;
  if (tabId === null) return null;

  const start = async (file: Blob | undefined) => {
    if (!file) {
      setHasStoredCv(false);
      return;
    }
    setState({ kind: "capturing" });
    try {
      const captured = await deps.captureAd(tabId);
      if (!captured.ok) {
        const reason = captured.reason === "JOB_AD_NOT_DETECTED" ? undefined : captured.reason;
        setState({
          kind: "error",
          message: errorMessageKey("JOB_AD_NOT_DETECTED", reason),
          fix: errorFixKey("JOB_AD_NOT_DETECTED", reason),
        });
        return;
      }
      setState({
        kind: "form",
        draft: {
          ad: captured.ad,
          pdf: file,
          fileName: storedCvName(file),
          ...ownCvDefaults(captured.ad),
        },
      });
    } catch (error) {
      logger.warn("own CV capture failed", error instanceof Error ? error.name : "unknown");
      setState({ kind: "error", message: "own_cv_failed" });
    }
  };

  const saveStored = () => {
    storedCv().then(
      (file) => void start(file),
      () => {
        setState({ kind: "error", message: "own_cv_failed" });
      },
    );
  };

  const choosePicked = async (file: File | undefined) => {
    if (!file) return;
    const problem = await validateCvFile(file);
    if (problem) {
      setState({ kind: "error", message: FILE_PROBLEMS[problem] });
      return;
    }
    await start(file);
  };

  const save = async (draft: Draft) => {
    setState({ kind: "saving", draft });
    try {
      await deps.store.getState().recordOwnCv({
        ad: draft.ad,
        pdf: draft.pdf,
        fileName: draft.fileName,
        title: draft.title,
        company: draft.company,
        language,
        now: new Date(),
      });
      setState({ kind: "saved", adKey: draft.ad.adKey });
    } catch (error) {
      logger.warn("own CV not saved", error instanceof Error ? error.name : "unknown");
      setState({ kind: "error", message: "own_cv_failed" });
    }
  };

  const submit = (draft: Draft) => {
    const existing = deps.store.getState().entries.find((entry) => entry.adKey === draft.ad.adKey);
    if (existing && entrySource(existing) === "tailored") {
      setState({ kind: "confirm-replace", draft });
      return;
    }
    void save(draft);
  };

  const draft =
    state.kind === "form" || state.kind === "confirm-replace" || state.kind === "saving"
      ? state.draft
      : null;
  const setDraft = (patch: Partial<Draft>) => {
    if (state.kind === "form") setState({ kind: "form", draft: { ...state.draft, ...patch } });
  };

  return (
    <section aria-label={t("own_cv_save")} className="flex flex-col gap-2">
      {draft ? (
        <form
          className="flex flex-col gap-2 rounded-md border p-3"
          onSubmit={(event) => {
            event.preventDefault();
            submit(draft);
          }}
        >
          <p className="text-xs text-muted-foreground">{t("own_cv_file", draft.fileName)}</p>
          <Label htmlFor={titleId}>{t("own_cv_title_label")}</Label>
          <Input
            id={titleId}
            value={draft.title}
            maxLength={200}
            disabled={state.kind !== "form"}
            onChange={(event) => {
              setDraft({ title: event.currentTarget.value });
            }}
          />
          <Label htmlFor={companyId}>{t("own_cv_company_label")}</Label>
          <Input
            id={companyId}
            value={draft.company}
            maxLength={200}
            disabled={state.kind !== "form"}
            onChange={(event) => {
              setDraft({ company: event.currentTarget.value });
            }}
          />
          <div className="flex flex-wrap gap-2">
            <Button type="submit" size="sm" disabled={state.kind !== "form"}>
              {state.kind === "saving" ? (
                <Loader2 aria-hidden="true" className="animate-spin" />
              ) : (
                <Save aria-hidden="true" />
              )}
              {t("own_cv_confirm")}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={state.kind === "saving"}
              onClick={() => {
                setState({ kind: "idle" });
              }}
            >
              {t("own_cv_cancel")}
            </Button>
          </div>
        </form>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">{t("own_cv_description")}</p>
          <div className="flex flex-wrap gap-2">
            {hasStoredCv ? (
              <Button
                size="sm"
                variant="outline"
                disabled={state.kind === "capturing"}
                onClick={saveStored}
              >
                {state.kind === "capturing" ? (
                  <Loader2 aria-hidden="true" className="animate-spin" />
                ) : (
                  <Save aria-hidden="true" />
                )}
                {t("own_cv_save")}
              </Button>
            ) : null}
            <Button
              size="sm"
              variant={hasStoredCv ? "ghost" : "outline"}
              disabled={state.kind === "capturing"}
              onClick={() => fileInput.current?.click()}
            >
              <FilePlus2 aria-hidden="true" />
              {t("own_cv_choose")}
            </Button>
            <label htmlFor={inputId} className="sr-only">
              {t("own_cv_choose")}
            </label>
            <input
              ref={fileInput}
              id={inputId}
              type="file"
              accept="application/pdf,.pdf"
              className="sr-only"
              tabIndex={-1}
              onChange={(event) => {
                const [file] = event.currentTarget.files ?? [];
                event.currentTarget.value = "";
                void choosePicked(file);
              }}
            />
          </div>
        </>
      )}
      {state.kind === "saved" ? (
        <p role="status" className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
          <History aria-hidden="true" className="size-4" />
          {t("result_saved_to_history")}
          <Button
            size="sm"
            variant="link"
            className="h-auto p-0"
            onClick={() => {
              deps.onShowEntry(state.adKey);
            }}
          >
            {t("hint_show")}
          </Button>
        </p>
      ) : null}
      {state.kind === "error" ? (
        <div role="alert" className="text-sm">
          <p>{t(state.message)}</p>
          {state.fix ? <p className="text-xs text-muted-foreground">{t(state.fix)}</p> : null}
        </div>
      ) : null}

      <AlertDialog
        open={state.kind === "confirm-replace"}
        onOpenChange={(isOpen) => {
          if (!isOpen && state.kind === "confirm-replace") {
            setState({ kind: "form", draft: state.draft });
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogTitle>{t("own_cv_replace_title")}</AlertDialogTitle>
          <AlertDialogDescription>{t("own_cv_replace_description")}</AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("own_cv_replace_keep")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (state.kind === "confirm-replace") void save(state.draft);
              }}
            >
              {t("own_cv_replace_confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
