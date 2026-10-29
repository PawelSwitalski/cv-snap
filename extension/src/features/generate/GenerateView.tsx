import type { CvProfile } from "@cv-snap/shared";
import { lazy, Suspense, useEffect, useState } from "react";
import { useStore } from "zustand";
import type { AddSiteResult } from "@/features/allowed-sites/allowed-sites";
import { useT } from "@/lib/i18n/i18n";
import { GenerateButton } from "./GenerateButton";
import { GenerationError } from "./GenerationError";
import { GenerationProgress } from "./GenerationProgress";
import { watchPageState, type PageState, type PageStateApis } from "./page-state";
import type { GenerateStore } from "./store";
import type { RenderFitted } from "./use-fitted-cv";

/** The preview pulls in react-pdf: loaded with the first result, not at panel start (≤ 500 ms). */
const ResultView = lazy(() => import("./ResultView"));

export interface GenerateViewDeps {
  store: GenerateStore;
  pageStateApis: PageStateApis;
  /** "Add this site" for the current tab (bolt 007); calls `permissions.request` synchronously. */
  addSite: (url: string) => Promise<AddSiteResult>;
  photo: () => Promise<Blob | undefined>;
  /** Tests replace react-pdf rendering. */
  render?: RenderFitted;
}

/**
 * The generate flow on home (stories 005–007): the adaptive button, then progress with Cancel,
 * then the result or the error. The button stays above a result, so the next ad is one click away.
 */
export function GenerateView({ deps, profile }: { deps: GenerateViewDeps; profile: CvProfile }) {
  const t = useT();
  const status = useStore(deps.store, (state) => state.status);
  const result = useStore(deps.store, (state) => state.result);
  const [pageState, setPageState] = useState<PageState>({ kind: "no-tab" });

  useEffect(() => watchPageState(deps.pageStateApis, setPageState), [deps.pageStateApis]);

  if (status.kind === "running") {
    return (
      <GenerationProgress
        step={status.step}
        onCancel={() => {
          deps.store.getState().cancel();
        }}
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <GenerateButton
        pageState={pageState}
        isProfileConfirmed={profile.confirmedAt !== null}
        onGenerate={(tabId) => {
          deps.store.getState().generate({ tabId, override: null });
        }}
        onAddSite={deps.addSite}
      />
      {status.kind === "error" ? (
        <GenerationError
          error={status.error}
          isOffline={status.isOffline}
          hasResult={result !== null}
          onRetry={() => {
            deps.store.getState().retry();
          }}
          onDismiss={() => {
            deps.store.getState().dismissError();
          }}
        />
      ) : null}
      {status.kind === "result" && result ? (
        <Suspense
          fallback={
            <p aria-live="polite" className="text-sm">
              {t("progress_rendering")}
            </p>
          }
        >
          <ResultView
            store={deps.store}
            result={result}
            profile={profile}
            photo={deps.photo}
            {...(deps.render ? { render: deps.render } : {})}
          />
        </Suspense>
      ) : null}
    </div>
  );
}
