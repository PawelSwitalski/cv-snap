import type { ProgressStep } from "@cv-snap/shared";
import { Check, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n/i18n";
import type { MessageKey } from "@/lib/i18n/messages";

/** The generation steps shown to the user, in order (the retry is part of checking). */
const SHOWN_STEPS = ["reading-job-ad", "parsing-requirements", "tailoring", "validating"] as const;

type ShownStep = (typeof SHOWN_STEPS)[number];

export const STEP_LABELS: Record<ProgressStep, MessageKey> = {
  "extracting-pdf-text": "progress_extracting_pdf_text",
  "creating-profile": "progress_creating_profile",
  "reading-job-ad": "progress_reading_job_ad",
  "parsing-requirements": "progress_parsing_requirements",
  tailoring: "progress_tailoring",
  validating: "progress_validating",
  retrying: "progress_retrying",
  rendering: "progress_rendering",
};

function shownIndex(step: ProgressStep | null): number {
  if (step === null) return 0;
  if (step === "retrying") return SHOWN_STEPS.indexOf("validating");
  const index = SHOWN_STEPS.indexOf(step as ShownStep);
  return index === -1 ? 0 : index;
}

/**
 * Progress of a running generation (story 005): the steps with the current one marked, announced
 * through `aria-live="polite"`, and Cancel, which returns the panel to ready at once (FR-16).
 */
export function GenerationProgress({
  step,
  onCancel,
}: {
  step: ProgressStep | null;
  onCancel: () => void;
}) {
  const t = useT();
  const current = shownIndex(step);
  const announced = t(STEP_LABELS[step ?? "reading-job-ad"]);
  return (
    <div className="flex flex-col gap-3">
      <p aria-live="polite" className="flex items-center gap-2 text-sm font-medium">
        <Loader2 aria-hidden="true" className="size-4 animate-spin" />
        {announced}
      </p>
      <ol className="flex flex-col gap-1 text-sm" aria-label={t("progress_steps")}>
        {SHOWN_STEPS.map((shown, index) => {
          const isDone = index < current;
          const isCurrent = index === current;
          return (
            <li
              key={shown}
              aria-current={isCurrent ? "step" : undefined}
              className={
                isDone || isCurrent
                  ? "flex items-center gap-2"
                  : "flex items-center gap-2 text-muted-foreground"
              }
            >
              {isDone ? (
                <Check aria-hidden="true" className="size-4" />
              ) : isCurrent ? (
                <Loader2 aria-hidden="true" className="size-4 animate-spin" />
              ) : (
                <span aria-hidden="true" className="size-4" />
              )}
              <span>{t(STEP_LABELS[shown])}</span>
              <span className="sr-only">
                {t(isDone ? "progress_done" : isCurrent ? "progress_current" : "progress_pending")}
              </span>
            </li>
          );
        })}
      </ol>
      {step === "retrying" ? (
        <p className="text-xs text-muted-foreground">{t("progress_retrying_note")}</p>
      ) : null}
      <Button variant="outline" className="self-start" onClick={onCancel}>
        <X aria-hidden="true" />
        {t("generate_cancel")}
      </Button>
    </div>
  );
}
