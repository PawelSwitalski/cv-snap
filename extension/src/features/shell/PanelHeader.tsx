import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n/i18n";

/**
 * Header: app name and Settings (story 008). The language and the privacy notice are in settings
 * (they were here until bolt 012). Settings is hidden until the privacy notice is acknowledged.
 */
export function PanelHeader({ onShowSettings }: { onShowSettings?: () => void }) {
  const t = useT();
  return (
    <header className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-2">
      <h1 className="text-base font-semibold">{t("extName")}</h1>
      {onShowSettings ? (
        <Button variant="ghost" size="sm" onClick={onShowSettings}>
          <Settings aria-hidden="true" />
          {t("settings_title")}
        </Button>
      ) : null}
    </header>
  );
}
