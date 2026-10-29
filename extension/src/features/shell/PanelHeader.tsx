import { ShieldCheck } from "lucide-react";
import { useId } from "react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/field";
import { useLanguage, useT } from "@/lib/i18n/i18n";
import { isLanguageOverride } from "@/lib/i18n/messages";

/**
 * Header: app name, the UI-language override (story 001; moves into settings with bolt 012) and
 * the "Privacy" entry that shows the notice again (story 002).
 */
export function PanelHeader({ onShowPrivacy }: { onShowPrivacy: () => void }) {
  const t = useT();
  const { override, setOverride } = useLanguage();
  const selectId = useId();
  return (
    <header className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-2">
      <h1 className="text-base font-semibold">{t("extName")}</h1>
      <div className="flex items-center gap-1">
        <label htmlFor={selectId} className="sr-only">
          {t("language_label")}
        </label>
        <Select
          id={selectId}
          className="h-8 w-auto"
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
        <Button variant="ghost" size="sm" onClick={onShowPrivacy}>
          <ShieldCheck aria-hidden="true" />
          {t("privacy_link")}
        </Button>
      </div>
    </header>
  );
}
