import { DEFAULT_MODEL } from "@cv-snap/shared";
import { Loader2 } from "lucide-react";
import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { useStore } from "zustand";
import { CvUpload } from "@/features/cv-upload/CvUpload";
import type { CreateProfileDeps } from "@/features/cv-upload/create-profile-flow";
import type { AddSiteResult } from "@/features/allowed-sites/allowed-sites";
import type { ConnectGeneration } from "@/features/generate/generation-client";
import type { GenerateViewDeps } from "@/features/generate/GenerateView";
import type { PageStateApis } from "@/features/generate/page-state";
import { createGenerateStore } from "@/features/generate/store";
import type { RenderFitted } from "@/features/generate/use-fitted-cv";
import { PrivacyNotice } from "@/features/onboarding/PrivacyNotice";
import {
  acknowledgeNotice,
  isNoticeAcknowledged,
  readAcknowledgedNoticeVersion,
} from "@/features/onboarding/privacy-notice";
import { SetupCheck } from "@/features/onboarding/SetupCheck";
import { ChromeStorageProfileRepository } from "@/features/profile/profile-repository";
import { createProfileStore } from "@/features/profile/store";
import { ErrorBoundary } from "@/features/shell/ErrorBoundary";
import { HomeView } from "@/features/shell/HomeView";
import { PanelError } from "@/features/shell/PanelError";
import { PanelHeader } from "@/features/shell/PanelHeader";
import { deriveView } from "@/features/shell/view";
import { ProfileExtraction } from "@/features/tailoring/profile-extraction";
import { I18nProvider, useT } from "@/lib/i18n/i18n";
import { logger } from "@/lib/logger";
import type { NativeHostClient } from "@/lib/native-host-client";
import { NativeHostProvider } from "@/lib/native-host-provider";
import type { FileStore } from "@/lib/storage/file-store";
import type { LocalStore } from "@/lib/storage/local-store";

/** The editor is the largest view; it loads only when a draft is opened (≤ 500 ms panel start). */
const ProfileEditor = lazy(() => import("@/features/profile/editor/ProfileEditor"));

export interface AppDeps {
  store: LocalStore;
  files: FileStore;
  /** The panel's long-lived host connection (upload, profile creation). */
  hostClient: () => NativeHostClient;
  /** A fresh connection per setup check, so "Check again" finds a newly installed host. */
  createHostClient: () => NativeHostClient;
  browserLanguage: string | undefined;
  /** The generate flow (bolt 011): background port, page state and "Add this site". */
  generate: {
    connect: ConnectGeneration;
    pageStateApis: PageStateApis;
    addSite: (url: string) => Promise<AddSiteResult>;
    /** `chrome.storage.session`: the last result survives closing the panel (bolt 011). */
    session?: LocalStore;
    render?: RenderFitted;
  };
}

/** Side panel root: error boundary → i18n → view router (story 001). */
export function App({ deps }: { deps: AppDeps }) {
  return (
    <ErrorBoundary
      fallback={(reset) => <PanelError browserLanguage={deps.browserLanguage} onRetry={reset} />}
    >
      <I18nProvider store={deps.store} browserLanguage={deps.browserLanguage}>
        <Panel deps={deps} />
      </I18nProvider>
    </ErrorBoundary>
  );
}

function Panel({ deps }: { deps: AppDeps }) {
  const t = useT();
  const repository = useMemo(() => new ChromeStorageProfileRepository(deps.store), [deps.store]);
  const generateStore = useMemo(
    () =>
      createGenerateStore({
        connect: deps.generate.connect,
        ...(deps.generate.session ? { session: deps.generate.session } : {}),
      }),
    [deps.generate.connect, deps.generate.session],
  );
  const profileStore = useMemo(
    () =>
      createProfileStore({
        repository,
        files: deps.files,
        // A CV generated from the previous profile no longer matches its facts.
        onActiveChanged: () => {
          generateStore.getState().clearResult();
        },
      }),
    [repository, deps.files, generateStore],
  );
  const generate = useMemo<GenerateViewDeps>(
    () => ({
      store: generateStore,
      pageStateApis: deps.generate.pageStateApis,
      addSite: deps.generate.addSite,
      photo: () => profileStore.getState().photo(),
      ...(deps.generate.render ? { render: deps.generate.render } : {}),
    }),
    [generateStore, deps.generate, profileStore],
  );
  const profileStatus = useStore(profileStore, (state) => state.status);
  const draft = useStore(profileStore, (state) => state.draft);
  const active = useStore(profileStore, (state) => state.active);

  const [noticeVersion, setNoticeVersion] = useState<number | null>(null);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
  const [isSetupPassed, setIsSetupPassed] = useState(false);
  const [isUploadRequested, setIsUploadRequested] = useState(false);

  useEffect(() => {
    readAcknowledgedNoticeVersion(deps.store)
      .catch(() => 0)
      .then(setNoticeVersion, () => undefined);
    // The last CV of this browser session, if the panel was closed after generating.
    void generateStore.getState().restoreSession();
    profileStore
      .getState()
      .load()
      .catch((error: unknown) => {
        logger.error("profile state not loaded", error instanceof Error ? error.name : "unknown");
      });
    // Pending edits are written when the panel closes (story 004: nothing lost).
    const flush = () => {
      void profileStore.getState().flush();
    };
    window.addEventListener("pagehide", flush);
    return () => {
      window.removeEventListener("pagehide", flush);
    };
  }, [deps.store, profileStore, generateStore]);

  const uploadDeps = useMemo<CreateProfileDeps>(
    () => ({
      client: deps.hostClient(),
      extraction: new ProfileExtraction(new NativeHostProvider(deps.hostClient())),
      files: deps.files,
      // A new CV starts a new draft (not an edit of the active profile).
      saveDraft: (newDraft) => repository.saveDraft(newDraft, null),
    }),
    [deps, repository],
  );

  const view = deriveView({
    isLoaded: noticeVersion !== null && profileStatus === "ready",
    isNoticeAcknowledged: noticeVersion !== null && isNoticeAcknowledged(noticeVersion),
    isPrivacyOpen,
    hasDraft: draft !== null,
    hasActive: active !== null,
    isSetupPassed,
    isUploadRequested,
  });

  return (
    <div className="flex min-h-screen flex-col">
      <PanelHeader
        onShowPrivacy={() => {
          setIsPrivacyOpen(true);
        }}
      />
      <main className="flex flex-col gap-3 p-4">
        {view === "loading" ? (
          <p aria-live="polite" className="flex items-center gap-2 text-sm">
            <Loader2 aria-hidden="true" className="size-4 animate-spin" />
            {t("loading")}
          </p>
        ) : null}
        {view === "privacy" ? (
          <PrivacyNotice
            isReview={noticeVersion !== null && isNoticeAcknowledged(noticeVersion)}
            onAcknowledge={() => {
              setIsPrivacyOpen(false);
              void acknowledgeNotice(deps.store).then(() =>
                readAcknowledgedNoticeVersion(deps.store).then(setNoticeVersion),
              );
            }}
          />
        ) : null}
        {view === "setup" ? (
          <SetupCheck
            createClient={deps.createHostClient}
            onContinue={() => {
              setIsSetupPassed(true);
            }}
          />
        ) : null}
        {view === "upload" ? (
          <CvUpload
            deps={uploadDeps}
            model={DEFAULT_MODEL}
            hasActiveProfile={active !== null}
            onDraftCreated={(newDraft) => {
              setIsUploadRequested(false);
              profileStore.getState().setNewDraft(newDraft);
            }}
            {...(active !== null
              ? {
                  onBack: () => {
                    setIsUploadRequested(false);
                  },
                }
              : {})}
          />
        ) : null}
        {view === "editor" ? (
          <Suspense
            fallback={
              <p aria-live="polite" className="text-sm">
                {t("loading")}
              </p>
            }
          >
            <ProfileEditor store={profileStore} />
          </Suspense>
        ) : null}
        {view === "home" && active ? (
          <HomeView
            profile={active}
            generate={generate}
            onEditProfile={() => {
              void profileStore.getState().editActive();
            }}
            onUploadNew={() => {
              setIsUploadRequested(true);
            }}
          />
        ) : null}
      </main>
    </div>
  );
}
