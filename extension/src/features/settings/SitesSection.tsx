import { Globe, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import type {
  AddSiteResult,
  AllowedSite,
  AllowedSitesStore,
} from "@/features/allowed-sites/allowed-sites";
import { SITE_PRESETS } from "@/features/allowed-sites/presets";
import { watchPageState, type PageState, type PageStateApis } from "@/features/generate/page-state";
import { useT } from "@/lib/i18n/i18n";
import type { MessageKey } from "@/lib/i18n/messages";
import { logger } from "@/lib/logger";
import { SettingsSection } from "./SettingsSection";

export interface SitesSectionDeps {
  allowedSites: Pick<
    AllowedSitesStore,
    "listSites" | "addPreset" | "addCurrentTab" | "removeSite" | "subscribe"
  >;
  /** The active tab, for "Add this site" (same page state as the Generate button). */
  pageStateApis: PageStateApis;
}

function problemKey(result: AddSiteResult): MessageKey | null {
  if (result.ok) return null;
  return result.reason === "DENIED" ? "settings_sites_denied" : "generate_add_failed";
}

/**
 * Allowed sites (story 008, backed by bolt 007): the granted sites with Remove (which revokes the
 * Chrome permission), presets not added yet, and the active tab. The list follows Chrome, so a
 * site removed in chrome://extensions disappears here too.
 */
export function SitesSection({ deps }: { deps: SitesSectionDeps }) {
  const t = useT();
  const [sites, setSites] = useState<AllowedSite[] | null>(null);
  const [pageState, setPageState] = useState<PageState>({ kind: "no-tab" });
  const [problem, setProblem] = useState<MessageKey | null>(null);
  const { allowedSites } = deps;

  useEffect(() => {
    let isCurrent = true;
    const refresh = () => {
      allowedSites.listSites().then(
        (list) => {
          if (isCurrent) setSites(list);
        },
        (error: unknown) => {
          logger.warn("allowed sites not read", error instanceof Error ? error.name : "unknown");
          if (isCurrent) setSites([]);
        },
      );
    };
    refresh();
    const unsubscribe = allowedSites.subscribe((list) => {
      if (isCurrent) setSites(list);
    });
    return () => {
      isCurrent = false;
      unsubscribe();
    };
  }, [allowedSites]);

  useEffect(() => watchPageState(deps.pageStateApis, setPageState), [deps.pageStateApis]);

  const after = (promise: Promise<AddSiteResult>) => {
    setProblem(null);
    void promise.then(
      (result) => {
        setProblem(problemKey(result));
        // permissions.onAdded refreshes the list as well; this covers a missed event.
        if (result.ok) void allowedSites.listSites().then(setSites);
      },
      () => {
        setProblem("generate_add_failed");
      },
    );
  };

  const grantedPresetIds = new Set((sites ?? []).map((site) => site.presetId));
  const missingPresets = SITE_PRESETS.filter((preset) => !grantedPresetIds.has(preset.id));

  return (
    <SettingsSection heading="settings_sites">
      <p className="text-xs text-muted-foreground">{t("settings_sites_note")}</p>
      {sites === null ? null : sites.length === 0 ? (
        <p className="text-sm">{t("settings_sites_empty")}</p>
      ) : (
        <ul className="flex flex-col gap-1" aria-label={t("settings_sites_list")}>
          {sites.map((site) => (
            <li key={site.pattern} className="flex items-center justify-between gap-2 text-sm">
              <span className="flex min-w-0 items-center gap-1">
                <Globe aria-hidden="true" className="size-4 shrink-0" />
                <span className="truncate">{site.label}</span>
              </span>
              <Button
                variant="ghost"
                size="sm"
                aria-label={t("settings_sites_remove", site.label)}
                onClick={() => {
                  void allowedSites
                    .removeSite(site.pattern)
                    .then(() => allowedSites.listSites().then(setSites));
                }}
              >
                <Trash2 aria-hidden="true" />
                {t("settings_sites_remove_short")}
              </Button>
            </li>
          ))}
        </ul>
      )}

      {pageState.kind === "site-not-allowed" ? (
        <Button
          variant="outline"
          size="sm"
          className="self-start"
          onClick={() => {
            // permissions.request must be the first call in the click (user gesture).
            after(allowedSites.addCurrentTab(pageState.url));
          }}
        >
          <Plus aria-hidden="true" />
          {t("generate_add_site")}
        </Button>
      ) : pageState.kind === "unknown-site" ? (
        <p className="text-xs text-muted-foreground">{t("generate_click_icon")}</p>
      ) : null}

      {missingPresets.length > 0 ? (
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium">{t("settings_sites_presets")}</p>
          <div className="flex flex-wrap gap-1">
            {missingPresets.map((preset) => (
              <Button
                key={preset.id}
                variant="outline"
                size="sm"
                aria-label={t("settings_sites_add_preset", preset.label)}
                onClick={() => {
                  after(allowedSites.addPreset(preset.id));
                }}
              >
                <Plus aria-hidden="true" />
                {preset.label}
              </Button>
            ))}
          </div>
        </div>
      ) : null}
      {problem ? (
        <p role="status" className="text-xs">
          {t(problem)}
        </p>
      ) : null}
    </SettingsSection>
  );
}
