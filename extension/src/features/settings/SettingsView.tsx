import { MODEL_IDS, type ModelId } from "@cv-snap/shared";
import { ArrowLeft, RotateCcw, ShieldCheck } from "lucide-react";
import { useId } from "react";
import { useStore } from "zustand";
import { Button } from "@/components/ui/button";
import { Label, Select, Textarea } from "@/components/ui/field";
import {
  DEFAULT_GDPR_CLAUSE_PL,
  DEFAULT_GDPR_CLAUSE_EN,
  type GdprClauseMode,
} from "@/features/cv-pdf/gdpr-clause";
import { useLanguage, useT } from "@/lib/i18n/i18n";
import { isLanguageOverride, type MessageKey } from "@/lib/i18n/messages";
import { BackupSection, type BackupSectionDeps } from "./BackupSection";
import { GDPR_CLAUSE_MODES, MAX_CLAUSE_CHARS } from "./settings";
import { SettingsSection } from "./SettingsSection";
import { SitesSection, type SitesSectionDeps } from "./SitesSection";
import type { SettingsStore } from "./store";

const MODEL_LABELS: Record<ModelId, [MessageKey, MessageKey]> = {
  "claude-sonnet-5-5": ["settings_model_sonnet", "settings_model_sonnet_note"],
  "claude-opus-5-5": ["settings_model_opus", "settings_model_opus_note"],
  "claude-haiku-5-5": ["settings_model_haiku", "settings_model_haiku_note"],
};

const MODE_LABELS: Record<GdprClauseMode, MessageKey> = {
  polishAdsOnly: "settings_gdpr_mode_polishAdsOnly",
  always: "settings_gdpr_mode_always",
  never: "settings_gdpr_mode_never",
};

export interface SettingsViewDeps {
  settings: SettingsStore;
  sites: SitesSectionDeps;
  backup: BackupSectionDeps;
}

/**
 * Settings (story 008): model, UI language, allowed sites, GDPR clause, privacy notice and the
 * profile backup (story 009). Every change applies at once; there is no Save button. Lazy-loaded.
 */
export default function SettingsView({
  deps,
  onBack,
  onShowPrivacy,
}: {
  deps: SettingsViewDeps;
  onBack: () => void;
  onShowPrivacy: () => void;
}) {
  const t = useT();
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft aria-hidden="true" />
          {t("settings_back")}
        </Button>
        <h2 className="text-base font-semibold">{t("settings_title")}</h2>
      </div>
      <ModelSection settings={deps.settings} />
      <LanguageSection />
      <SitesSection deps={deps.sites} />
      <GdprSection settings={deps.settings} />
      <SettingsSection heading="settings_privacy">
        <p className="text-sm text-muted-foreground">{t("settings_privacy_note")}</p>
        <Button variant="outline" size="sm" className="self-start" onClick={onShowPrivacy}>
          <ShieldCheck aria-hidden="true" />
          {t("settings_privacy_show")}
        </Button>
      </SettingsSection>
      <BackupSection deps={deps.backup} />
    </div>
  );
}

function ModelSection({ settings }: { settings: SettingsStore }) {
  const t = useT();
  const model = useStore(settings, (state) => state.model);
  const name = useId();
  return (
    <SettingsSection heading="settings_model">
      <fieldset className="flex flex-col gap-2">
        <legend className="sr-only">{t("settings_model")}</legend>
        {MODEL_IDS.map((id) => {
          const [label, note] = MODEL_LABELS[id];
          const inputId = `${name}-${id}`;
          return (
            <div key={id} className="flex items-start gap-2">
              <input
                id={inputId}
                type="radio"
                name={name}
                className="mt-1 size-4 accent-primary"
                checked={model === id}
                aria-describedby={`${inputId}-note`}
                onChange={() => {
                  settings.getState().setModel(id);
                }}
              />
              <div className="flex flex-col">
                <Label htmlFor={inputId}>{t(label)}</Label>
                <span id={`${inputId}-note`} className="text-xs text-muted-foreground">
                  {t(note)}
                </span>
              </div>
            </div>
          );
        })}
      </fieldset>
      <p className="text-xs text-muted-foreground">{t("settings_model_applies")}</p>
    </SettingsSection>
  );
}

function LanguageSection() {
  const t = useT();
  const { override, setOverride } = useLanguage();
  const selectId = useId();
  return (
    <SettingsSection heading="settings_language">
      <Label htmlFor={selectId}>{t("language_label")}</Label>
      <Select
        id={selectId}
        value={override}
        onChange={(event) => {
          const value = event.currentTarget.value;
          if (isLanguageOverride(value)) setOverride(value);
        }}
      >
        <option value="auto">{t("language_auto")}</option>
        <option value="en">{t("language_en")}</option>
        <option value="pl">{t("language_pl")}</option>
      </Select>
      <p className="text-xs text-muted-foreground">{t("settings_language_note")}</p>
    </SettingsSection>
  );
}

function GdprSection({ settings }: { settings: SettingsStore }) {
  const t = useT();
  const clause = useStore(settings, (state) => state.gdprClause);
  const name = useId();
  const plId = useId();
  const enId = useId();
  // Saved on every keystroke; `maxLength` keeps the text within what the store accepts.
  const update = (change: Partial<typeof clause>) => {
    settings.getState().setGdprClause({ ...clause, ...change });
  };
  return (
    <SettingsSection heading="settings_gdpr">
      <p className="text-xs text-muted-foreground">{t("settings_gdpr_note")}</p>
      <fieldset className="flex flex-col gap-1">
        <legend className="text-sm font-medium">{t("settings_gdpr_mode")}</legend>
        {GDPR_CLAUSE_MODES.map((mode) => {
          const inputId = `${name}-${mode}`;
          return (
            <div key={mode} className="flex items-center gap-2">
              <input
                id={inputId}
                type="radio"
                name={name}
                className="size-4 accent-primary"
                checked={clause.mode === mode}
                onChange={() => {
                  update({ mode });
                }}
              />
              <Label htmlFor={inputId}>{t(MODE_LABELS[mode])}</Label>
            </div>
          );
        })}
      </fieldset>
      <Label htmlFor={plId}>{t("settings_gdpr_text_pl")}</Label>
      <Textarea
        id={plId}
        rows={4}
        lang="pl"
        value={clause.textPl}
        maxLength={MAX_CLAUSE_CHARS}
        onChange={(event) => {
          update({ textPl: event.target.value });
        }}
      />
      <Label htmlFor={enId}>{t("settings_gdpr_text_en")}</Label>
      <Textarea
        id={enId}
        rows={4}
        lang="en"
        value={clause.textEn}
        maxLength={MAX_CLAUSE_CHARS}
        onChange={(event) => {
          update({ textEn: event.target.value });
        }}
      />
      <p className="text-xs text-muted-foreground">{t("settings_gdpr_blank_note")}</p>
      <Button
        variant="outline"
        size="sm"
        className="self-start"
        onClick={() => {
          update({ textPl: DEFAULT_GDPR_CLAUSE_PL, textEn: DEFAULT_GDPR_CLAUSE_EN });
        }}
      >
        <RotateCcw aria-hidden="true" />
        {t("settings_gdpr_restore")}
      </Button>
    </SettingsSection>
  );
}
