import type { Bullet, CvDate } from "@cv-snap/shared";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { useId, useMemo, useState, type KeyboardEvent, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox, Input, Label, Select, Textarea } from "@/components/ui/field";
import { useLanguage, useT } from "@/lib/i18n/i18n";
import type { MessageKey } from "@/lib/i18n/messages";

/** Labelled one-line text input. Empty optional fields are stored as `null`. */
export function TextField({
  label,
  value,
  onChange,
  isRequired = false,
  showErrors = false,
  isNullable = false,
  type = "text",
}: {
  label: MessageKey;
  value: string | null;
  onChange: (value: string | null) => void;
  isRequired?: boolean;
  showErrors?: boolean;
  isNullable?: boolean;
  type?: "text" | "email" | "url" | "tel";
}) {
  const t = useT();
  const id = useId();
  const isInvalid = showErrors && isRequired && (value ?? "").trim() === "";
  return (
    <div className="flex flex-col gap-1">
      <Label htmlFor={id}>
        {t(label)}
        {isRequired ? <span aria-hidden="true">{" *"}</span> : null}
      </Label>
      <Input
        id={id}
        type={type}
        value={value ?? ""}
        required={isRequired}
        aria-invalid={isInvalid || undefined}
        onChange={(event) => {
          const next = event.currentTarget.value;
          onChange(isNullable && next.trim() === "" ? null : next);
        }}
      />
    </div>
  );
}

/** Comma-separated list (skills of a job or project). */
export function ListField({
  label,
  values,
  onChange,
}: {
  label: MessageKey;
  values: string[];
  onChange: (values: string[]) => void;
}) {
  const t = useT();
  const id = useId();
  const hintId = useId();
  return (
    <div className="flex flex-col gap-1">
      <Label htmlFor={id}>{t(label)}</Label>
      <Input
        id={id}
        aria-describedby={hintId}
        defaultValue={values.join(", ")}
        onBlur={(event) => {
          onChange(
            event.currentTarget.value
              .split(",")
              .map((value) => value.trim())
              .filter((value) => value.length > 0),
          );
        }}
      />
      <p id={hintId} className="text-xs text-muted-foreground">
        {t("editor_list_hint")}
      </p>
    </div>
  );
}

/** Month (optional) + year. Month names come from `Intl` in the UI language (no hard-coded text). */
export function DateField({
  label,
  value,
  onChange,
  isDisabled = false,
}: {
  label: MessageKey;
  value: CvDate | null;
  onChange: (value: CvDate | null) => void;
  isDisabled?: boolean;
}) {
  const t = useT();
  const { language } = useLanguage();
  const id = useId();
  const monthNames = useMemo(() => {
    const format = new Intl.DateTimeFormat(language, { month: "long" });
    return Array.from({ length: 12 }, (_, index) => format.format(new Date(2024, index, 1)));
  }, [language]);
  return (
    <fieldset className="flex flex-col gap-1" disabled={isDisabled}>
      <legend className="text-sm font-medium">{t(label)}</legend>
      <div className="flex gap-2">
        <Select
          aria-label={t("editor_month")}
          value={value?.month ?? ""}
          onChange={(event) => {
            const month =
              event.currentTarget.value === "" ? null : Number(event.currentTarget.value);
            if (value) onChange({ ...value, month });
          }}
          disabled={isDisabled || value === null}
        >
          <option value="">{t("editor_month_none")}</option>
          {monthNames.map((name, index) => (
            <option key={name} value={index + 1}>
              {name}
            </option>
          ))}
        </Select>
        <YearInput
          id={id}
          label={t("editor_year")}
          year={value?.year ?? null}
          onYear={(year) => {
            onChange(year === null ? null : { year, month: value?.month ?? null });
          }}
        />
      </div>
    </fieldset>
  );
}

/**
 * Year input with its own text state: partial input ("20") is kept while typing and committed once
 * it is a valid year (1900–2100); clearing it clears the date. Invalid text reverts on blur.
 */
function YearInput({
  id,
  label,
  year,
  onYear,
}: {
  id: string;
  label: string;
  year: number | null;
  onYear: (year: number | null) => void;
}) {
  const [text, setText] = useState(year === null ? "" : String(year));
  const [shownYear, setShownYear] = useState(year);
  if (year !== shownYear) {
    // The stored value changed elsewhere (undo, reorder): show it.
    setShownYear(year);
    setText(year === null ? "" : String(year));
  }
  return (
    <Input
      id={id}
      aria-label={label}
      inputMode="numeric"
      className="w-24"
      value={text}
      onChange={(event) => {
        const next = event.currentTarget.value.trim();
        setText(next);
        const parsed = Number(next);
        if (next === "") {
          setShownYear(null);
          onYear(null);
        } else if (/^\d{4}$/.test(next) && parsed >= 1900 && parsed <= 2100) {
          setShownYear(parsed);
          onYear(parsed);
        }
      }}
      onBlur={() => {
        setText(year === null ? "" : String(year));
      }}
    />
  );
}

export function CurrentField({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  const t = useT();
  const id = useId();
  return (
    <div className="flex items-center gap-2">
      <Checkbox
        id={id}
        checked={value}
        onChange={(event) => {
          onChange(event.currentTarget.checked);
        }}
      />
      <Label htmlFor={id}>{t("editor_current")}</Label>
    </div>
  );
}

/**
 * Move up / Move down / Delete for one item, plus Alt+↑ / Alt+↓ on the item itself (keyboard
 * reordering, story 004; no drag and drop).
 */
export function ItemToolbar({
  name,
  onMove,
  onDelete,
  isFirst,
  isLast,
}: {
  name: string;
  onMove: (delta: -1 | 1) => void;
  onDelete: () => void;
  isFirst: boolean;
  isLast: boolean;
}) {
  const t = useT();
  return (
    <div className="flex gap-1">
      <Button
        variant="ghost"
        size="icon"
        aria-label={t("editor_move_up", name)}
        disabled={isFirst}
        onClick={() => {
          onMove(-1);
        }}
      >
        <ArrowUp aria-hidden="true" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        aria-label={t("editor_move_down", name)}
        disabled={isLast}
        onClick={() => {
          onMove(1);
        }}
      >
        <ArrowDown aria-hidden="true" />
      </Button>
      <Button variant="ghost" size="icon" aria-label={t("editor_delete", name)} onClick={onDelete}>
        <Trash2 aria-hidden="true" />
      </Button>
    </div>
  );
}

/** Alt+↑ / Alt+↓ handler for an item container. */
export function reorderKeys(onMove: (delta: -1 | 1) => void) {
  return (event: KeyboardEvent<HTMLElement>) => {
    if (!event.altKey) return;
    if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      event.preventDefault();
      // Bullet rows sit inside their item's card: without this, Alt+↑ on a bullet would also
      // move the whole job.
      event.stopPropagation();
      onMove(event.key === "ArrowUp" ? -1 : 1);
    }
  };
}

/** One editable item with its toolbar; reorderable with Alt+↑/↓ while focus is inside. */
export function ItemCard({
  title,
  toolbar,
  onMove,
  children,
}: {
  title: string;
  toolbar: ReactNode;
  onMove: (delta: -1 | 1) => void;
  children: ReactNode;
}) {
  const headingId = useId();
  return (
    <fieldset
      aria-labelledby={headingId}
      onKeyDown={reorderKeys(onMove)}
      className="flex flex-col gap-2 rounded-md border p-3"
    >
      <div className="flex items-center justify-between gap-2">
        <h4 id={headingId} className="truncate text-sm font-medium">
          {title}
        </h4>
        {toolbar}
      </div>
      {children}
    </fieldset>
  );
}

/** Editable lines (bullets) of one item: edit, add, delete, reorder. */
export function LinesEditor({
  label,
  lines,
  showErrors,
  onChange,
  onAdd,
  onDelete,
  onMove,
}: {
  label: MessageKey;
  lines: Bullet[];
  showErrors: boolean;
  onChange: (lineId: string, text: string) => void;
  onAdd: () => void;
  onDelete: (lineId: string) => void;
  onMove: (lineId: string, delta: -1 | 1) => void;
}) {
  const t = useT();
  const groupId = useId();
  return (
    <div role="group" aria-labelledby={groupId} className="flex flex-col gap-2">
      <p id={groupId} className="text-sm font-medium">
        {t(label)}
      </p>
      {lines.map((line, index) => (
        <LineRow
          key={line.id}
          line={line}
          index={index}
          isFirst={index === 0}
          isLast={index === lines.length - 1}
          showErrors={showErrors}
          onChange={onChange}
          onDelete={onDelete}
          onMove={onMove}
        />
      ))}
      <Button variant="outline" size="sm" className="self-start" onClick={onAdd}>
        <Plus aria-hidden="true" />
        {t("editor_add_line")}
      </Button>
    </div>
  );
}

function LineRow({
  line,
  index,
  isFirst,
  isLast,
  showErrors,
  onChange,
  onDelete,
  onMove,
}: {
  line: Bullet;
  index: number;
  isFirst: boolean;
  isLast: boolean;
  showErrors: boolean;
  onChange: (lineId: string, text: string) => void;
  onDelete: (lineId: string) => void;
  onMove: (lineId: string, delta: -1 | 1) => void;
}) {
  const t = useT();
  const id = useId();
  const lineName = t("editor_line_name", String(index + 1));
  const move = (delta: -1 | 1) => {
    onMove(line.id, delta);
  };
  return (
    <div className="flex items-start gap-1" onKeyDown={reorderKeys(move)}>
      <Label htmlFor={id} className="sr-only">
        {lineName}
      </Label>
      <Textarea
        id={id}
        rows={2}
        value={line.text}
        aria-invalid={(showErrors && line.text.trim() === "") || undefined}
        onChange={(event) => {
          onChange(line.id, event.currentTarget.value);
        }}
      />
      <ItemToolbar
        name={lineName}
        isFirst={isFirst}
        isLast={isLast}
        onMove={move}
        onDelete={() => {
          onDelete(line.id);
        }}
      />
    </div>
  );
}
