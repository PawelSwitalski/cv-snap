import { planLines, type CvProfile, type LanguageCode, type LineId } from "@cv-snap/shared";
import {
  AlertTriangle,
  CircleSlash,
  Download,
  ListChecks,
  Loader2,
  RefreshCw,
  Scissors,
  Undo2,
} from "lucide-react";
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label, Select } from "@/components/ui/field";
import { downloadPdf } from "@/features/cv-pdf/download";
import { buildCvFileName } from "@/features/cv-pdf/file-name";
import type { DroppedContent } from "@/features/cv-pdf/fit-to-pages";
import { registerCvFonts } from "@/features/cv-pdf/fonts";
import { selectClause, type GdprClauseSettings } from "@/features/cv-pdf/gdpr-clause";
import { renderFittedCv } from "@/features/cv-pdf/render";
import type { GenerationResult } from "@/features/generation/generation-result";
import { useLanguage, useT } from "@/lib/i18n/i18n";
import { CvPreview, lineElementId } from "./CvPreview";
import { buildPreviewModel, isAllUnverified } from "./preview-model";
import type { GenerateStore } from "./store";
import { currentFit, useFittedCv, type RenderFitted } from "./use-fitted-cv";

/** Output languages offered for the override (FR-12); any other ad language is added when seen. */
const OVERRIDE_LANGUAGES: readonly LanguageCode[] = ["pl", "en", "de", "fr", "es", "it", "uk"];

/** The real renderer: fonts from the extension package, two-page fitting, final PDF (bolt 009). */
const renderInExtension: RenderFitted = (model) => {
  registerCvFonts((fileName) =>
    browser.runtime.getURL(`/fonts/${fileName}` as Parameters<typeof browser.runtime.getURL>[0]),
  );
  return renderFittedCv(model);
};

export interface ResultViewProps {
  store: GenerateStore;
  result: GenerationResult;
  /** The confirmed profile the result was generated from. */
  profile: CvProfile;
  photo: () => Promise<Blob | undefined>;
  /** The GDPR clause settings (story 008); a change re-renders the preview and the PDF. */
  gdprClause: GdprClauseSettings;
  render?: RenderFitted;
  download?: (pdf: Blob, fileName: string) => void;
}

/**
 * A generation result (story 006): which ad it is for, the unverified-lines summary, the parsed
 * requirements and the gaps, the CV language override, the preview with editing, what two-page
 * fitting dropped, and the download of exactly the previewed PDF. Lazy-loaded (react-pdf is large).
 */
export default function ResultView({
  store,
  result,
  profile,
  photo,
  gdprClause,
  render = renderInExtension,
  download = downloadPdf,
}: ResultViewProps) {
  const t = useT();
  const changes = useStore(store, (state) => state.changes);
  const photoDataUrl = usePhotoDataUrl(photo);

  const clause = selectClause(gdprClause, result.requirements.language, result.outputLanguage.code);
  const preview = useMemo(
    () => buildPreviewModel(result.plan, profile, changes, { photoDataUrl, clause }),
    [result.plan, profile, changes, photoDataUrl, clause],
  );
  const fitted = useFittedCv(preview.model, render);
  // Edits show at once; the fitted model (with two-page drops) replaces it when it is ready.
  const current = currentFit(fitted, preview.model);
  const shown = current?.model ?? preview.model;
  const [isWarningOpen, setIsWarningOpen] = useState(false);

  const { title, company } = result.requirements;
  const unverified = preview.validation.summary.unverified;
  const firstUnverified = preview.validation.results.find(
    (verdict) => verdict.status === "unverified",
  )?.lineId;

  const save = () => {
    // Only the PDF fitted from what the preview shows (FR-13).
    if (!current) return;
    download(current.pdf, buildCvFileName(profile.contact.fullName, company));
  };

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-base font-semibold">
        {company ? t("result_title_company", title, company) : t("result_title", title)}
      </h2>

      {unverified > 0 ? (
        <Alert variant="warning">
          <AlertTitle>
            <AlertTriangle aria-hidden="true" />
            {t("result_unverified_count", String(unverified))}
          </AlertTitle>
          <AlertDescription className="flex flex-col items-start gap-1">
            {t("result_unverified_explained")}
            {firstUnverified ? (
              <Button
                size="sm"
                variant="link"
                className="h-auto p-0"
                onClick={() => {
                  const element = document.getElementById(lineElementId(firstUnverified));
                  element?.scrollIntoView({ block: "center" });
                  element?.focus();
                }}
              >
                {t("result_show_first_unverified")}
              </Button>
            ) : null}
          </AlertDescription>
        </Alert>
      ) : (
        <p className="flex items-center gap-1 text-sm">
          <ListChecks aria-hidden="true" className="size-4" />
          {t("result_all_verified")}
        </p>
      )}

      <RequirementsPanel result={result} />
      <GapsList gaps={result.gaps} />
      <LanguageOverride
        result={result}
        onRegenerate={(override) => {
          store.getState().regenerate(override);
        }}
      />

      <CvPreview
        model={shown}
        lineIds={preview.lineIds}
        annotations={preview.annotations}
        actions={{
          onEdit: (lineId, text) => {
            store.getState().editLine(lineId, text);
          },
          onRemove: (lineId) => {
            store.getState().removeLine(lineId);
          },
        }}
      />

      <RemovedLines
        result={result}
        removed={changes.removed}
        onRestore={(lineId) => {
          store.getState().restoreLine(lineId);
        }}
      />
      {current ? <DroppedList dropped={current.dropped} /> : null}

      <div className="flex flex-col gap-1">
        <Button
          disabled={!current}
          onClick={() => {
            if (isAllUnverified(preview.validation)) setIsWarningOpen(true);
            else save();
          }}
        >
          {!current && fitted.status !== "failed" ? (
            <Loader2 aria-hidden="true" className="animate-spin" />
          ) : (
            <Download aria-hidden="true" />
          )}
          {t("result_download")}
        </Button>
        <p aria-live="polite" className="text-xs text-muted-foreground">
          {!current && fitted.status !== "failed" ? t("progress_rendering") : null}
          {fitted.status === "failed" ? t("result_render_failed") : null}
        </p>
      </div>

      <AlertDialog open={isWarningOpen} onOpenChange={setIsWarningOpen}>
        <AlertDialogContent>
          <AlertDialogTitle>{t("result_all_unverified_title")}</AlertDialogTitle>
          <AlertDialogDescription>{t("result_all_unverified_description")}</AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("result_all_unverified_review")}</AlertDialogCancel>
            <AlertDialogAction onClick={save}>
              {t("result_all_unverified_download")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function usePhotoDataUrl(photo: () => Promise<Blob | undefined>): string | null {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  useEffect(() => {
    let isCurrent = true;
    void photo()
      .then((blob) => (blob ? blobToDataUrl(blob) : null))
      .catch(() => null)
      .then((url) => {
        if (isCurrent) setDataUrl(url);
      });
    return () => {
      isCurrent = false;
    };
  }, [photo]);
  return dataUrl;
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      // readAsDataURL always yields a string.
      resolve(typeof reader.result === "string" ? reader.result : "");
    };
    reader.onerror = () => {
      reject(reader.error ?? new Error("photo not read"));
    };
    reader.readAsDataURL(blob);
  });
}

function RequirementsPanel({ result }: { result: GenerationResult }) {
  const t = useT();
  const { requirements } = result;
  const groups = [
    ["result_must_haves", requirements.mustHaves],
    ["result_nice_to_haves", requirements.niceToHaves],
    ["result_keywords", requirements.keywords],
  ] as const;
  return (
    <details className="rounded-md border p-2 text-sm">
      <summary className="cursor-pointer font-medium">{t("result_requirements")}</summary>
      <div className="mt-2 flex flex-col gap-2">
        {result.fromCache ? (
          <p className="text-xs text-muted-foreground">{t("result_requirements_cached")}</p>
        ) : null}
        {groups.map(([label, items]) =>
          items.length > 0 ? (
            <div key={label}>
              <p className="text-xs font-semibold">{t(label)}</p>
              <ul className="list-disc pl-4">
                {items.map((item, index) => (
                  <li key={`${label}-${String(index)}`}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null,
        )}
      </div>
    </details>
  );
}

function GapsList({ gaps }: { gaps: GenerationResult["gaps"] }) {
  const t = useT();
  const headingId = useId();
  if (gaps.length === 0) return null;
  return (
    <section aria-labelledby={headingId} className="rounded-md border p-2 text-sm">
      <h3 id={headingId} className="flex items-center gap-1 font-medium">
        <CircleSlash aria-hidden="true" className="size-4" />
        {t("result_gaps", String(gaps.length))}
      </h3>
      <p className="text-xs text-muted-foreground">{t("result_gaps_explained")}</p>
      <ul className="mt-1 list-disc pl-4">
        {gaps.map((gap, index) => (
          <li key={`gap-${String(index)}`}>
            {gap.requirement}
            {gap.note ? <span className="text-muted-foreground"> — {gap.note}</span> : null}
          </li>
        ))}
      </ul>
    </section>
  );
}

const AUTO = "auto";

function LanguageOverride({
  result,
  onRegenerate,
}: {
  result: GenerationResult;
  onRegenerate: (override: LanguageCode | null) => void;
}) {
  const t = useT();
  const { language: uiLanguage } = useLanguage();
  const selectId = useId();
  const current = result.outputLanguage;
  const [choice, setChoice] = useState<string>(current.source === "override" ? current.code : AUTO);
  const names = useMemo(
    () => new Intl.DisplayNames([uiLanguage], { type: "language" }),
    [uiLanguage],
  );
  const options = [...new Set([...OVERRIDE_LANGUAGES, current.code])];
  const chosen = choice === AUTO ? null : choice;
  const isSame =
    (chosen === null && current.source !== "override") ||
    (chosen !== null && current.source === "override" && chosen === current.code);
  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="flex min-w-40 flex-1 flex-col gap-1">
        <Label htmlFor={selectId}>{t("result_cv_language")}</Label>
        <Select
          id={selectId}
          value={choice}
          onChange={(event) => {
            setChoice(event.target.value);
          }}
        >
          <option value={AUTO}>{t("result_cv_language_auto")}</option>
          {options.map((code) => (
            <option key={code} value={code}>
              {names.of(code) ?? code}
            </option>
          ))}
        </Select>
      </div>
      <Button
        variant="outline"
        disabled={isSame}
        onClick={() => {
          onRegenerate(chosen);
        }}
      >
        <RefreshCw aria-hidden="true" />
        {t("result_regenerate")}
      </Button>
      <p className="w-full text-xs text-muted-foreground">
        {t("result_cv_language_current", names.of(current.code) ?? current.code)}
      </p>
    </div>
  );
}

function RemovedLines({
  result,
  removed,
  onRestore,
}: {
  result: GenerationResult;
  removed: readonly LineId[];
  onRestore: (lineId: LineId) => void;
}) {
  const t = useT();
  const headingId = useId();
  const lines = useMemo(() => planLines(result.plan), [result.plan]);
  if (removed.length === 0) return null;
  return (
    <section aria-labelledby={headingId} className="rounded-md border p-2 text-sm">
      <h3 id={headingId} className="font-medium">
        {t("result_removed", String(removed.length))}
      </h3>
      <ul className="mt-1 flex flex-col gap-1">
        {removed.map((lineId) => {
          const line = lines.find((candidate) => candidate.lineId === lineId);
          return (
            <li key={lineId} className="flex items-start justify-between gap-2">
              <span className="text-muted-foreground line-through">{line?.text ?? lineId}</span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  onRestore(lineId);
                }}
              >
                <Undo2 aria-hidden="true" />
                {t("result_restore")}
              </Button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function DroppedList({ dropped }: { dropped: DroppedContent[] }) {
  const t = useT();
  const headingId = useId();
  if (dropped.length === 0) return null;
  return (
    <section aria-labelledby={headingId} className="rounded-md border p-2 text-sm">
      <h3 id={headingId} className="flex items-center gap-1 font-medium">
        <Scissors aria-hidden="true" className="size-4" />
        {t("result_dropped", String(dropped.length))}
      </h3>
      <p className="text-xs text-muted-foreground">{t("result_dropped_explained")}</p>
      <ul className="mt-1 list-disc pl-4">
        {dropped.map((item, index) => (
          <li key={`${item.entryId}-${String(index)}`}>
            {item.kind === "item"
              ? t("result_dropped_item", item.title ?? item.entryId)
              : t("result_dropped_bullet", item.title ?? item.entryId, item.text ?? "")}
          </li>
        ))}
      </ul>
    </section>
  );
}
