import type { LineId } from "@cv-snap/shared";
import { AlertTriangle, Check, PencilLine, Trash2, UserPen, X } from "lucide-react";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label, Textarea } from "@/components/ui/field";
import type { CvEntry, CvModel, CvSection } from "@/features/cv-pdf/cv-model";
import { useT } from "@/lib/i18n/i18n";
import { cn } from "@/lib/utils";
import type { LineAnnotation, PrintedLineIds } from "./preview-model";

export interface LineActions {
  onEdit: (lineId: LineId, text: string) => void;
  onRemove: (lineId: LineId) => void;
}

/** DOM id of a previewed line, for "Show the first unverified line". */
export const lineElementId = (lineId: LineId) => `line-${lineId.replace(/[^A-Za-z0-9_-]/g, "_")}`;

/**
 * The side-panel preview of the fitted CV model (FR-13): the same model the PDF prints, as HTML in
 * one column. Generated lines carry their verdict: unverified lines are marked with an icon and
 * text (never colour alone), edited lines say so; every line can be edited or removed. Markers are
 * preview-only and never reach the PDF.
 */
export function CvPreview({
  model,
  lineIds,
  annotations,
  actions,
}: {
  model: CvModel;
  lineIds: PrintedLineIds;
  annotations: ReadonlyMap<LineId, LineAnnotation>;
  actions: LineActions;
}) {
  const t = useT();
  const { header } = model;
  return (
    <article
      aria-label={t("preview_label")}
      lang={model.language}
      className="flex flex-col gap-4 rounded-md border bg-card p-3 text-card-foreground"
    >
      <header className="flex items-start gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <p className="text-lg font-semibold">{header.fullName}</p>
          {header.headline ? <p className="text-sm">{header.headline}</p> : null}
          {header.contactLines.length > 0 ? (
            <p className="text-xs break-words text-muted-foreground">
              {header.contactLines.join(" · ")}
            </p>
          ) : null}
        </div>
        {header.photoDataUrl ? (
          <img src={header.photoDataUrl} alt="" className="size-16 rounded object-cover" />
        ) : null}
      </header>
      {model.sections.map((section) => (
        <PreviewSection
          key={section.key}
          section={section}
          lineIds={lineIds}
          annotations={annotations}
          actions={actions}
        />
      ))}
      {model.clause ? <p className="text-[0.7rem] text-muted-foreground">{model.clause}</p> : null}
    </article>
  );
}

function sectionLineIds(
  section: CvSection,
  entry: CvEntry,
  lineIds: PrintedLineIds,
): readonly (LineId | undefined)[] {
  if (section.key === "summary") return lineIds.summary;
  if (section.key === "skills") return lineIds.skills;
  if (section.layout === "entries") return lineIds.items.get(entry.id) ?? [];
  // Languages and certifications come from the profile as they are: not generated lines.
  return [];
}

function PreviewSection({
  section,
  lineIds,
  annotations,
  actions,
}: {
  section: CvSection;
  lineIds: PrintedLineIds;
  annotations: ReadonlyMap<LineId, LineAnnotation>;
  actions: LineActions;
}) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-2">
      <h3 id={headingId} className="border-b text-sm font-semibold tracking-wide uppercase">
        {section.heading}
      </h3>
      {section.entries.map((entry) => {
        const ids = sectionLineIds(section, entry, lineIds);
        return (
          <div key={entry.id} className="flex flex-col gap-1">
            {entry.title || entry.subtitle || entry.dates ? (
              <div className="flex flex-wrap items-baseline justify-between gap-x-2">
                <p className="text-sm font-medium">
                  {[entry.title, entry.subtitle].filter(Boolean).join(" · ")}
                </p>
                {entry.dates ? (
                  <p className="text-xs text-muted-foreground">{entry.dates}</p>
                ) : null}
              </div>
            ) : null}
            <ul className={cn("flex flex-col gap-1", section.layout === "entries" && "pl-3")}>
              {entry.bullets.map((text, index) => {
                const lineId = ids[index];
                const annotation = lineId === undefined ? undefined : annotations.get(lineId);
                return (
                  <li
                    key={lineId ?? `${entry.id}-${String(index)}`}
                    className={cn(section.layout === "entries" && "list-disc")}
                  >
                    {lineId !== undefined && annotation ? (
                      <PreviewLine
                        lineId={lineId}
                        text={text}
                        annotation={annotation}
                        actions={actions}
                      />
                    ) : (
                      <span className="text-sm">{text}</span>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </section>
  );
}

function PreviewLine({
  lineId,
  text,
  annotation,
  actions,
}: {
  lineId: LineId;
  text: string;
  annotation: LineAnnotation;
  actions: LineActions;
}) {
  const t = useT();
  const inputId = useId();
  const [draft, setDraft] = useState<string | null>(null);
  const isUnverified = annotation.status === "unverified";

  if (draft !== null) {
    return (
      <div className="flex flex-col gap-1">
        <Label htmlFor={inputId} className="sr-only">
          {t("preview_edit_label")}
        </Label>
        <Textarea
          id={inputId}
          value={draft}
          rows={3}
          autoFocus
          onChange={(event) => {
            setDraft(event.target.value);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") setDraft(null);
          }}
        />
        <div className="flex gap-1">
          <Button
            size="sm"
            disabled={draft.trim().length === 0}
            onClick={() => {
              if (draft.trim() !== text) actions.onEdit(lineId, draft.trim());
              setDraft(null);
            }}
          >
            <Check aria-hidden="true" />
            {t("preview_save")}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setDraft(null);
            }}
          >
            <X aria-hidden="true" />
            {t("preview_cancel_edit")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      id={lineElementId(lineId)}
      tabIndex={-1}
      className={cn(
        "group flex items-start gap-1 rounded-sm",
        isUnverified && "border-l-4 border-warning bg-warning/10 pl-1",
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="text-sm">{text}</span>
        {isUnverified ? (
          <span className="flex items-center gap-1 text-xs font-medium text-warning">
            <AlertTriangle aria-hidden="true" className="size-3.5 shrink-0" />
            {t("preview_unverified")}
          </span>
        ) : null}
        {annotation.isUserEdited ? (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <UserPen aria-hidden="true" className="size-3.5 shrink-0" />
            {t("preview_user_edited")}
          </span>
        ) : null}
      </div>
      <div
        className={cn(
          "flex shrink-0 gap-0.5",
          !isUnverified && "opacity-0 group-hover:opacity-100 focus-within:opacity-100",
        )}
      >
        <Button
          size="icon"
          variant="ghost"
          aria-label={t("preview_edit_line", text)}
          onClick={() => {
            setDraft(text);
          }}
        >
          <PencilLine aria-hidden="true" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          aria-label={t("preview_remove_line", text)}
          onClick={() => {
            actions.onRemove(lineId);
          }}
        >
          <Trash2 aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}
