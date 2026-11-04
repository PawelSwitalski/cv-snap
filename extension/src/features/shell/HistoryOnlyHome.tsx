import { MousePointerClick, Wrench } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { AddSiteResult } from "@/features/allowed-sites/allowed-sites";
import { AddSiteButton, pageNoteKey } from "@/features/generate/GenerateButton";
import { watchPageState, type PageState, type PageStateApis } from "@/features/generate/page-state";
import { HistoryHint, usePageAdKey } from "@/features/history/HistoryHint";
import { SaveOwnCv, type SaveOwnCvDeps } from "@/features/history/SaveOwnCv";
import { useT } from "@/lib/i18n/i18n";

export interface HistoryOnlyHomeDeps {
  pageStateApis: PageStateApis;
  addSite: (url: string) => Promise<AddSiteResult>;
  ownCv: SaveOwnCvDeps;
  adKeyOfTab: (tabId: number) => Promise<string | null>;
}

/**
 * Home in history-only mode (story 001-history-only-onboarding): save the user's own CV for the ad
 * in the tab and see it in History. Tailoring waits for the helper, offered as "Set up the helper".
 * Nothing here talks to the host.
 */
export function HistoryOnlyHome({
  deps,
  onSetUpHelper,
}: {
  deps: HistoryOnlyHomeDeps;
  onSetUpHelper: () => void;
}) {
  const t = useT();
  const [pageState, setPageState] = useState<PageState>({ kind: "no-tab" });
  useEffect(() => watchPageState(deps.pageStateApis, setPageState), [deps.pageStateApis]);
  const pageAdKey = usePageAdKey(pageState, deps.adKeyOfTab);
  const historyStore = deps.ownCv.store;
  useEffect(() => {
    void historyStore.getState().load();
  }, [historyStore]);

  return (
    <div className="flex flex-col gap-3">
      <Card aria-labelledby="history-home-title">
        <CardHeader>
          <CardTitle id="history-home-title">{t("history_home_title")}</CardTitle>
          <CardDescription>{t("history_home_description")}</CardDescription>
        </CardHeader>
        <CardContent>
          {pageState.kind === "site-not-allowed" ? (
            <AddSiteButton url={pageState.url} onAddSite={deps.addSite} />
          ) : pageState.kind === "ad-detected" || pageState.kind === "no-ad" ? (
            <>
              <SaveOwnCv pageState={pageState} deps={deps.ownCv} />
              {pageState.kind === "no-ad" ? (
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MousePointerClick aria-hidden="true" className="size-3.5 shrink-0" />
                  {t("own_cv_select_hint")}
                </p>
              ) : null}
            </>
          ) : (
            <p className="text-xs text-muted-foreground">{t(pageNoteKey(pageState))}</p>
          )}
          <HistoryHint store={historyStore} adKey={pageAdKey} onShow={deps.ownCv.onShowEntry} />
        </CardContent>
      </Card>
      <Card aria-labelledby="history-home-helper">
        <CardHeader>
          <CardTitle id="history-home-helper">{t("history_home_helper_title")}</CardTitle>
          <CardDescription>{t("history_home_helper_description")}</CardDescription>
        </CardHeader>
        <CardFooter>
          <Button variant="outline" onClick={onSetUpHelper}>
            <Wrench aria-hidden="true" />
            {t("history_home_set_up_helper")}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
