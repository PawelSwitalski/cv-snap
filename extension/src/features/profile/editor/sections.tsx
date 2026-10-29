import type { CvProfileContent } from "@cv-snap/shared";
import { Plus } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n/i18n";
import type { MessageKey } from "@/lib/i18n/messages";
import {
  addItem,
  addLine,
  moveItem,
  moveLine,
  removeItem,
  removeLine,
  updateItem,
  updateLine,
  type LineSection,
  type ListSection,
} from "../editing";
import {
  CurrentField,
  DateField,
  ItemCard,
  ItemToolbar,
  LinesEditor,
  ListField,
  TextField,
} from "./fields";

type Edit = (
  change: (draft: CvProfileContent) => CvProfileContent,
  options?: { isDeletion?: boolean },
) => void;

export interface SectionProps {
  draft: CvProfileContent;
  edit: Edit;
  showErrors: boolean;
}

type Item<S extends ListSection> = CvProfileContent[S][number];

/** Section titles and the per-item name used in button labels ("Move Acme up"). */
const SECTION_TITLES: Record<ListSection, MessageKey> = {
  summary: "section_summary",
  experience: "section_experience",
  projects: "section_projects",
  education: "section_education",
  skills: "section_skills",
  languages: "section_languages",
  certifications: "section_certifications",
  otherSections: "section_other",
};

/**
 * One collapsible section (native `<details>`: keyboard accessible without extra code) with its
 * items, each editable, deletable (with undo) and reorderable.
 */
function ListSectionEditor<S extends ListSection>({
  section,
  draft,
  edit,
  itemName,
  renderFields,
  addLabel,
}: {
  section: S;
  draft: CvProfileContent;
  edit: Edit;
  itemName: (item: Item<S>, index: number) => string;
  renderFields: (item: Item<S>) => ReactNode;
  addLabel: MessageKey;
}) {
  const t = useT();
  const items = draft[section] as Item<S>[];
  return (
    <details open className="rounded-lg border bg-card">
      <summary className="cursor-pointer select-none px-4 py-3 text-sm font-semibold">
        {t(SECTION_TITLES[section])} {`(${String(items.length)})`}
      </summary>
      <div className="flex flex-col gap-3 px-4 pb-4">
        {items.map((item, index) => {
          const name = itemName(item, index);
          const move = (delta: -1 | 1) => {
            edit((current) => moveItem(current, section, item.id, delta));
          };
          return (
            <ItemCard
              key={item.id}
              title={name}
              onMove={move}
              toolbar={
                <ItemToolbar
                  name={name}
                  isFirst={index === 0}
                  isLast={index === items.length - 1}
                  onMove={move}
                  onDelete={() => {
                    edit((current) => removeItem(current, section, item.id), { isDeletion: true });
                  }}
                />
              }
            >
              {renderFields(item)}
            </ItemCard>
          );
        })}
        <Button
          variant="outline"
          size="sm"
          className="self-start"
          onClick={() => {
            edit((current) => addItem(current, section).profile);
          }}
        >
          <Plus aria-hidden="true" />
          {t(addLabel)}
        </Button>
      </div>
    </details>
  );
}

function linesFor(
  section: LineSection,
  itemId: string,
  edit: Edit,
): {
  onChange: (lineId: string, text: string) => void;
  onAdd: () => void;
  onDelete: (lineId: string) => void;
  onMove: (lineId: string, delta: -1 | 1) => void;
} {
  return {
    onChange: (lineId, text) => {
      edit((draft) => updateLine(draft, section, itemId, lineId, text));
    },
    onAdd: () => {
      edit((draft) => addLine(draft, section, itemId).profile);
    },
    onDelete: (lineId) => {
      edit((draft) => removeLine(draft, section, itemId, lineId), { isDeletion: true });
    },
    onMove: (lineId, delta) => {
      edit((draft) => moveLine(draft, section, itemId, lineId, delta));
    },
  };
}

export function ProfileSections({ draft, edit, showErrors }: SectionProps) {
  const t = useT();
  const fallbackName = (index: number) => t("editor_item_name", String(index + 1));
  const patch =
    <S extends ListSection>(section: S, id: string) =>
    (fields: Partial<Omit<Item<S>, "id">>) => {
      edit((current) => updateItem(current, section, id, fields));
    };

  return (
    <div className="flex flex-col gap-3">
      <ListSectionEditor
        section="summary"
        draft={draft}
        edit={edit}
        addLabel="editor_add_summary"
        itemName={(_item, index) => t("editor_line_name", String(index + 1))}
        renderFields={(item) => (
          <TextField
            label="field_summary_line"
            value={item.text}
            isRequired
            showErrors={showErrors}
            onChange={(text) => {
              patch("summary", item.id)({ text: text ?? "" });
            }}
          />
        )}
      />

      <ListSectionEditor
        section="experience"
        draft={draft}
        edit={edit}
        addLabel="editor_add_experience"
        itemName={(item, index) => item.company || item.title || fallbackName(index)}
        renderFields={(item) => {
          const set = patch("experience", item.id);
          return (
            <>
              <TextField
                label="field_company"
                value={item.company}
                onChange={(v) => {
                  set({ company: v });
                }}
              />
              <TextField
                label="field_job_title"
                value={item.title}
                isRequired
                showErrors={showErrors}
                onChange={(v) => {
                  set({ title: v ?? "" });
                }}
              />
              <TextField
                label="field_location"
                value={item.location}
                isNullable
                onChange={(v) => {
                  set({ location: v });
                }}
              />
              <DateField
                label="field_start_date"
                value={item.startDate}
                onChange={(v) => {
                  set({ startDate: v });
                }}
              />
              <CurrentField
                value={item.isCurrent}
                onChange={(v) => {
                  set({ isCurrent: v, endDate: v ? null : item.endDate });
                }}
              />
              <DateField
                label="field_end_date"
                value={item.endDate}
                isDisabled={item.isCurrent}
                onChange={(v) => {
                  set({ endDate: v });
                }}
              />
              <LinesEditor
                label="field_bullets"
                lines={item.bullets}
                showErrors={showErrors}
                {...linesFor("experience", item.id, edit)}
              />
              <ListField
                label="field_item_skills"
                values={item.skills}
                onChange={(v) => {
                  set({ skills: v });
                }}
              />
            </>
          );
        }}
      />

      <ListSectionEditor
        section="projects"
        draft={draft}
        edit={edit}
        addLabel="editor_add_project"
        itemName={(item, index) => item.name || fallbackName(index)}
        renderFields={(item) => {
          const set = patch("projects", item.id);
          return (
            <>
              <TextField
                label="field_project_name"
                value={item.name}
                isRequired
                showErrors={showErrors}
                onChange={(v) => {
                  set({ name: v ?? "" });
                }}
              />
              <TextField
                label="field_role"
                value={item.role}
                isNullable
                onChange={(v) => {
                  set({ role: v });
                }}
              />
              <TextField
                label="field_url"
                type="url"
                value={item.url}
                isNullable
                onChange={(v) => {
                  set({ url: v });
                }}
              />
              <DateField
                label="field_start_date"
                value={item.startDate}
                onChange={(v) => {
                  set({ startDate: v });
                }}
              />
              <CurrentField
                value={item.isCurrent}
                onChange={(v) => {
                  set({ isCurrent: v, endDate: v ? null : item.endDate });
                }}
              />
              <DateField
                label="field_end_date"
                value={item.endDate}
                isDisabled={item.isCurrent}
                onChange={(v) => {
                  set({ endDate: v });
                }}
              />
              <LinesEditor
                label="field_bullets"
                lines={item.bullets}
                showErrors={showErrors}
                {...linesFor("projects", item.id, edit)}
              />
              <ListField
                label="field_item_skills"
                values={item.skills}
                onChange={(v) => {
                  set({ skills: v });
                }}
              />
            </>
          );
        }}
      />

      <ListSectionEditor
        section="education"
        draft={draft}
        edit={edit}
        addLabel="editor_add_education"
        itemName={(item, index) => item.institution || fallbackName(index)}
        renderFields={(item) => {
          const set = patch("education", item.id);
          return (
            <>
              <TextField
                label="field_institution"
                value={item.institution}
                isRequired
                showErrors={showErrors}
                onChange={(v) => {
                  set({ institution: v ?? "" });
                }}
              />
              <TextField
                label="field_degree"
                value={item.degree}
                isNullable
                onChange={(v) => {
                  set({ degree: v });
                }}
              />
              <TextField
                label="field_field_of_study"
                value={item.field}
                isNullable
                onChange={(v) => {
                  set({ field: v });
                }}
              />
              <DateField
                label="field_start_date"
                value={item.startDate}
                onChange={(v) => {
                  set({ startDate: v });
                }}
              />
              <CurrentField
                value={item.isCurrent}
                onChange={(v) => {
                  set({ isCurrent: v, endDate: v ? null : item.endDate });
                }}
              />
              <DateField
                label="field_end_date"
                value={item.endDate}
                isDisabled={item.isCurrent}
                onChange={(v) => {
                  set({ endDate: v });
                }}
              />
              <LinesEditor
                label="field_bullets"
                lines={item.bullets}
                showErrors={showErrors}
                {...linesFor("education", item.id, edit)}
              />
            </>
          );
        }}
      />

      <ListSectionEditor
        section="skills"
        draft={draft}
        edit={edit}
        addLabel="editor_add_skill"
        itemName={(item, index) => item.name || fallbackName(index)}
        renderFields={(item) => {
          const set = patch("skills", item.id);
          return (
            <>
              <TextField
                label="field_skill"
                value={item.name}
                isRequired
                showErrors={showErrors}
                onChange={(v) => {
                  set({ name: v ?? "" });
                }}
              />
              <TextField
                label="field_category"
                value={item.category}
                isNullable
                onChange={(v) => {
                  set({ category: v });
                }}
              />
            </>
          );
        }}
      />

      <ListSectionEditor
        section="languages"
        draft={draft}
        edit={edit}
        addLabel="editor_add_language"
        itemName={(item, index) => item.name || fallbackName(index)}
        renderFields={(item) => {
          const set = patch("languages", item.id);
          return (
            <>
              <TextField
                label="field_language"
                value={item.name}
                isRequired
                showErrors={showErrors}
                onChange={(v) => {
                  set({ name: v ?? "" });
                }}
              />
              <TextField
                label="field_level"
                value={item.level}
                isNullable
                onChange={(v) => {
                  set({ level: v });
                }}
              />
            </>
          );
        }}
      />

      <ListSectionEditor
        section="certifications"
        draft={draft}
        edit={edit}
        addLabel="editor_add_certification"
        itemName={(item, index) => item.name || fallbackName(index)}
        renderFields={(item) => {
          const set = patch("certifications", item.id);
          return (
            <>
              <TextField
                label="field_certification"
                value={item.name}
                isRequired
                showErrors={showErrors}
                onChange={(v) => {
                  set({ name: v ?? "" });
                }}
              />
              <TextField
                label="field_issuer"
                value={item.issuer}
                isNullable
                onChange={(v) => {
                  set({ issuer: v });
                }}
              />
              <DateField
                label="field_date"
                value={item.date}
                onChange={(v) => {
                  set({ date: v });
                }}
              />
            </>
          );
        }}
      />

      <ListSectionEditor
        section="otherSections"
        draft={draft}
        edit={edit}
        addLabel="editor_add_other"
        itemName={(item, index) => item.title || fallbackName(index)}
        renderFields={(item) => (
          <>
            <TextField
              label="field_section_title"
              value={item.title}
              isRequired
              showErrors={showErrors}
              onChange={(v) => {
                patch("otherSections", item.id)({ title: v ?? "" });
              }}
            />
            <LinesEditor
              label="field_items"
              lines={item.items}
              showErrors={showErrors}
              {...linesFor("otherSections", item.id, edit)}
            />
          </>
        )}
      />
    </div>
  );
}
