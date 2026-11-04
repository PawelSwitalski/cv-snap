import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  createNativeHostClient,
  type NativeHostClient,
  type NativePort,
} from "@/lib/native-host-client";
import { createMemoryFileStore, FILE_KEYS } from "@/lib/storage/file-store";
import { createMemoryStore, STORAGE_KEYS } from "@/lib/storage/local-store";
import { formatMessage } from "@/lib/i18n/messages";
import { PRIVACY_NOTICE_VERSION } from "@/features/onboarding/privacy-notice";
import { smallProfile } from "../../../test/cv-fixtures";
import {
  adPageFacts,
  fakeConnector,
  fakePageStateApis,
  fakeRender,
  generationResult,
} from "../../../test/generate-fixtures";
import { draftContent, HEALTHY, healthClient, pdfFile } from "../../../test/panel-fixtures";
import { fakeAllowedSites } from "../../../test/settings-fixtures";
import { createMemoryHistoryRepository } from "@/features/history/history-repository";
import { historyRowId } from "@/features/history/HistoryView";
import { historyEntry } from "../../../test/history-fixtures";
import { buildBackupFile } from "@/features/profile/backup";
import { App, type AppDeps } from "./App";

/** A host connection that never answers (the setup check stays in "checking"). */
function silentClient() {
  const port: NativePort = {
    postMessage: () => undefined,
    disconnect: () => undefined,
    onMessage: { addListener: () => undefined },
    onDisconnect: { addListener: () => undefined },
  };
  return createNativeHostClient({
    connect: () => port,
    lastErrorMessage: () => undefined,
    newRequestId: () => "r1",
  });
}

function deps(overrides: Partial<AppDeps> = {}): AppDeps {
  const client = silentClient();
  return {
    store: createMemoryStore(),
    files: createMemoryFileStore(),
    hostClient: () => client,
    createHostClient: silentClient,
    browserLanguage: "en-US",
    generate: {
      connect: () => {
        throw new Error("no background in this test");
      },
      pageStateApis: {
        activeTab: () => Promise.resolve(null),
        grantedPatterns: () => Promise.resolve([]),
        jobAdStatus: () => Promise.resolve(null),
        subscribe: () => () => undefined,
      },
      addSite: () => Promise.resolve({ ok: false, reason: "DENIED" }),
    },
    allowedSites: fakeAllowedSites(),
    ...overrides,
  };
}

describe("App", () => {
  it("shows the privacy notice first and the setup check after acknowledging it", async () => {
    const user = userEvent.setup();
    render(<App deps={deps()} />);

    expect(
      await screen.findByRole("heading", { name: "Before you start: your data" }),
    ).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "I understand, continue" }));

    expect(await screen.findByRole("heading", { name: "Setup check" })).toBeTruthy();
  });

  it("follows a Polish browser", async () => {
    render(<App deps={deps({ browserLanguage: "pl-PL" })} />);

    expect(
      await screen.findByRole("heading", { name: "Zanim zaczniesz: Twoje dane" }),
    ).toBeTruthy();
  });

  const en = (key: Parameters<typeof formatMessage>[1]) => formatMessage("en", key);
  const acknowledged = { [STORAGE_KEYS.privacyNoticeVersion]: PRIVACY_NOTICE_VERSION };

  it("goes from the setup check to the upload when the setup is healthy", async () => {
    const user = userEvent.setup();
    const healthy = () => healthClient({ report: HEALTHY });
    render(
      <App deps={deps({ store: createMemoryStore(acknowledged), createHostClient: healthy })} />,
    );

    await user.click(await screen.findByRole("button", { name: en("setup_continue") }));

    expect(await screen.findByRole("heading", { name: en("upload_title") })).toBeTruthy();
  });

  it("opens straight to home for a confirmed profile, without the notice", async () => {
    const store = createMemoryStore({
      ...acknowledged,
      [STORAGE_KEYS.activeProfile]: smallProfile(),
    });
    render(<App deps={deps({ store })} />);

    expect(await screen.findByRole("heading", { name: en("home_title") })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: en("privacy_title") })).toBeNull();
  });

  it("shows the notice again when its version changed", async () => {
    const store = createMemoryStore({
      [STORAGE_KEYS.privacyNoticeVersion]: PRIVACY_NOTICE_VERSION - 1,
      [STORAGE_KEYS.activeProfile]: smallProfile(),
    });
    render(<App deps={deps({ store })} />);

    expect(await screen.findByRole("heading", { name: en("privacy_title") })).toBeTruthy();
  });

  it("reopens the notice from settings and returns there, then home", async () => {
    const user = userEvent.setup();
    const store = createMemoryStore({
      ...acknowledged,
      [STORAGE_KEYS.activeProfile]: smallProfile(),
    });
    render(<App deps={deps({ store })} />);
    await screen.findByRole("heading", { name: en("home_title") });

    await user.click(screen.getByRole("button", { name: en("settings_title") }));
    await user.click(await screen.findByRole("button", { name: en("settings_privacy_show") }));
    expect(await screen.findByRole("heading", { name: en("privacy_title") })).toBeTruthy();
    await user.click(screen.getByRole("button", { name: en("privacy_close") }));
    expect(await screen.findByRole("heading", { name: en("settings_title") })).toBeTruthy();
    await user.click(screen.getByRole("button", { name: en("settings_back") }));

    expect(await screen.findByRole("heading", { name: en("home_title") })).toBeTruthy();
  });

  it("reopens an unfinished draft in the editor after the panel was closed", async () => {
    const store = createMemoryStore({
      ...acknowledged,
      [STORAGE_KEYS.draftProfile]: { content: draftContent(), basedOn: null },
    });
    render(<App deps={deps({ store })} />);

    expect(await screen.findByRole("heading", { name: en("editor_title_review") })).toBeTruthy();
  });

  it("generates from home in one click and locks the profile while it runs", async () => {
    const user = userEvent.setup();
    const connector = fakeConnector();
    const store = createMemoryStore({
      ...acknowledged,
      [STORAGE_KEYS.activeProfile]: smallProfile(),
    });
    render(
      <App
        deps={deps({
          store,
          generate: {
            connect: connector.connect,
            pageStateApis: fakePageStateApis(adPageFacts()).apis,
            addSite: () => Promise.resolve({ ok: false, reason: "DENIED" }),
            render: fakeRender().render,
          },
        })}
      />,
    );

    await user.click(await screen.findByRole("button", { name: en("generate_button") }));
    const editProfile = screen.getByRole("button", { name: en("home_edit_profile") });
    expect((editProfile as HTMLButtonElement).disabled).toBe(true);

    act(() => {
      connector.last().emit({ type: "result", result: generationResult() });
    });

    expect(await screen.findByRole("article", { name: en("preview_label") })).toBeTruthy();
    expect((editProfile as HTMLButtonElement).disabled).toBe(false);
  });

  it("shows the last CV again after the panel is closed and reopened", async () => {
    const user = userEvent.setup();
    const connector = fakeConnector();
    const session = createMemoryStore();
    const store = createMemoryStore({
      ...acknowledged,
      [STORAGE_KEYS.activeProfile]: smallProfile(),
    });
    const panelDeps = deps({
      store,
      generate: {
        connect: connector.connect,
        pageStateApis: fakePageStateApis(adPageFacts()).apis,
        addSite: () => Promise.resolve({ ok: false, reason: "DENIED" }),
        render: fakeRender().render,
        session,
      },
    });
    const first = render(<App deps={panelDeps} />);
    await user.click(await screen.findByRole("button", { name: en("generate_button") }));
    act(() => {
      connector.last().emit({ type: "result", result: generationResult() });
    });
    await screen.findByRole("article", { name: en("preview_label") });

    first.unmount();
    render(<App deps={panelDeps} />);

    expect(await screen.findByRole("article", { name: en("preview_label") })).toBeTruthy();
  });

  describe("settings in use (story 008)", () => {
    const withProfile = () =>
      createMemoryStore({ ...acknowledged, [STORAGE_KEYS.activeProfile]: smallProfile() });

    async function chooseModel(user: ReturnType<typeof userEvent.setup>, name: string) {
      await user.click(await screen.findByRole("button", { name: en("settings_title") }));
      await user.click(await screen.findByRole("radio", { name }));
      await user.click(screen.getByRole("button", { name: en("settings_back") }));
    }

    it("generates with the model chosen in settings", async () => {
      const user = userEvent.setup();
      const connector = fakeConnector();
      render(
        <App
          deps={deps({
            store: withProfile(),
            generate: {
              connect: connector.connect,
              pageStateApis: fakePageStateApis(adPageFacts()).apis,
              addSite: () => Promise.resolve({ ok: false, reason: "DENIED" }),
              render: fakeRender().render,
            },
          })}
        />,
      );

      await chooseModel(user, en("settings_model_haiku"));
      await user.click(await screen.findByRole("button", { name: en("generate_button") }));

      expect(connector.last().posted[0]).toMatchObject({ model: "claude-haiku-5-5" });
    });

    it("creates the profile from an uploaded CV with the chosen model", async () => {
      const user = userEvent.setup();
      const requests: { type: string; model?: string }[] = [];
      const client: NativeHostClient = {
        request: (payload) => {
          requests.push(payload);
          if (payload.type === "extractPdfText") {
            return Promise.resolve({
              text: "Jan Testowy, frontend developer.",
              pageCount: 1,
            } as never);
          }
          return new Promise(() => undefined);
        },
        disconnect: () => undefined,
      };
      render(<App deps={deps({ store: withProfile(), hostClient: () => client })} />);

      await chooseModel(user, en("settings_model_opus"));
      await user.click(await screen.findByRole("button", { name: en("home_upload_new") }));
      const input = document.querySelector<HTMLInputElement>('input[type="file"]');
      if (!input) throw new Error("no file input");
      fireEvent.change(input, { target: { files: [pdfFile()] } });

      await waitFor(() => {
        expect(requests.map((request) => request.type)).toContain("createProfile");
      });
      expect(requests.find((request) => request.type === "createProfile")?.model).toBe(
        "claude-opus-5-5",
      );
    });

    it("prints the GDPR clause from settings in the preview", async () => {
      const user = userEvent.setup();
      const connector = fakeConnector();
      const store = withProfile();
      await store.set(STORAGE_KEYS.gdprClause, {
        mode: "always",
        textPl: "Moja klauzula testowa.",
        textEn: "My test clause.",
      });
      render(
        <App
          deps={deps({
            store,
            generate: {
              connect: connector.connect,
              pageStateApis: fakePageStateApis(adPageFacts()).apis,
              addSite: () => Promise.resolve({ ok: false, reason: "DENIED" }),
              render: fakeRender().render,
            },
          })}
        />,
      );

      await user.click(await screen.findByRole("button", { name: en("generate_button") }));
      act(() => {
        connector.last().emit({ type: "result", result: generationResult() });
      });

      const preview = await screen.findByRole("article", { name: en("preview_label") });
      expect(within(preview).getByText("Moja klauzula testowa.")).toBeTruthy();
    });
  });
});

describe("App: history", () => {
  const en = (key: Parameters<typeof formatMessage>[1], ...subs: string[]) =>
    formatMessage("en", key, subs);

  async function historyDeps(adKeyOfTab: (tabId: number) => Promise<string | null>) {
    const repository = createMemoryHistoryRepository();
    await repository.put(historyEntry({ company: "Acme" }), {
      pdf: new Blob(["%PDF"]),
      adText: "ad",
    });
    return {
      repository,
      adKeyOfTab,
      actions: { openPdf: vi.fn(), openPage: vi.fn(), openUrl: vi.fn() },
    };
  }

  function panel(history: AppDeps["history"]) {
    const store = createMemoryStore({
      [STORAGE_KEYS.privacyNoticeVersion]: PRIVACY_NOTICE_VERSION,
      [STORAGE_KEYS.activeProfile]: smallProfile(),
    });
    render(
      <App
        deps={deps({
          store,
          generate: {
            connect: fakeConnector().connect,
            pageStateApis: fakePageStateApis(adPageFacts()).apis,
            addSite: () => Promise.resolve({ ok: false, reason: "DENIED" }),
            render: fakeRender().render,
          },
          ...(history ? { history } : {}),
        })}
      />,
    );
  }

  it("opens History from the header and goes back home", async () => {
    const user = userEvent.setup();
    panel(await historyDeps(() => Promise.resolve(null)));

    await user.click(await screen.findByRole("button", { name: en("history_title") }));

    expect(await screen.findByRole("heading", { name: en("history_title") })).toBeTruthy();
    expect(screen.getByText("Acme")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: en("action_back") }));
    expect(await screen.findByRole("button", { name: en("generate_button") })).toBeTruthy();
  });

  it("hints that the ad in the tab is already in history, and shows the entry", async () => {
    const user = userEvent.setup();
    Element.prototype.scrollIntoView = vi.fn();
    panel(await historyDeps(() => Promise.resolve(historyEntry().adKey)));

    await user.click(await screen.findByRole("button", { name: en("hint_show") }));

    expect(await screen.findByRole("heading", { name: en("history_title") })).toBeTruthy();
    await waitFor(() => {
      expect(document.activeElement?.id).toBe(historyRowId(historyEntry().adKey));
    });
  });

  it("saves the user's own CV for the ad without any call to the host (intent 005)", async () => {
    const user = userEvent.setup();
    const repository = createMemoryHistoryRepository();
    const files = createMemoryFileStore();
    await files.set(FILE_KEYS.cvOriginal, pdfFile("Moje_CV.pdf"));
    const client = silentClient();
    const request = vi.spyOn(client, "request");
    const connect = vi.fn(fakeConnector().connect);
    render(
      <App
        deps={deps({
          store: createMemoryStore({
            [STORAGE_KEYS.privacyNoticeVersion]: PRIVACY_NOTICE_VERSION,
            [STORAGE_KEYS.activeProfile]: smallProfile(),
          }),
          files,
          hostClient: () => client,
          createHostClient: () => client,
          generate: {
            connect,
            pageStateApis: fakePageStateApis(adPageFacts()).apis,
            addSite: () => Promise.resolve({ ok: false, reason: "DENIED" }),
            render: fakeRender().render,
          },
          history: {
            repository,
            adKeyOfTab: () => Promise.resolve(null),
            captureOwnCvAd: () =>
              Promise.resolve({
                ok: true,
                ad: {
                  ad: {
                    text: "Frontend Developer at Acme",
                    url: "https://jobs.example.com/1",
                    structuredFields: null,
                    isManualSelection: false,
                  },
                  adKey: "own-ad",
                  snapshot: { status: "none" },
                  pageTitle: "Frontend Developer",
                },
              }),
            actions: { openPdf: vi.fn(), openPage: vi.fn(), openUrl: vi.fn() },
          },
        })}
      />,
    );

    await user.click(await screen.findByRole("button", { name: en("own_cv_save") }));
    await user.click(await screen.findByRole("button", { name: en("own_cv_confirm") }));

    expect(await screen.findByText(en("result_saved_to_history"))).toBeTruthy();
    expect(await repository.get("own-ad")).toMatchObject({
      source: "own",
      title: "Frontend Developer",
      fileName: "Moje_CV.pdf",
    });
    expect(request).not.toHaveBeenCalled();
    expect(connect).not.toHaveBeenCalled();
  });

  it("has no History button without a history (e.g. previews)", async () => {
    panel(undefined);

    await screen.findByRole("button", { name: en("generate_button") });
    expect(screen.queryByRole("button", { name: en("history_title") })).toBeNull();
  });

  it("deletes entries the retention setting no longer keeps when the panel opens", async () => {
    const repository = createMemoryHistoryRepository();
    for (const [adKey, lastDownloadedAt] of [
      ["recent", new Date().toISOString()],
      ["old", "2020-01-01T10:00:00.000Z"],
    ] as const) {
      await repository.put(historyEntry({ adKey, lastDownloadedAt }), {
        pdf: new Blob(["%PDF"]),
        adText: "a",
      });
    }
    const store = createMemoryStore({
      [STORAGE_KEYS.privacyNoticeVersion]: PRIVACY_NOTICE_VERSION,
      [STORAGE_KEYS.activeProfile]: smallProfile(),
      [STORAGE_KEYS.historyRetention]: { mode: "months", months: 6 },
    });
    render(
      <App
        deps={deps({
          store,
          history: {
            repository,
            adKeyOfTab: () => Promise.resolve(null),
            actions: { openPdf: vi.fn(), openPage: vi.fn(), openUrl: vi.fn() },
          },
        })}
      />,
    );

    await waitFor(async () => {
      expect((await repository.list()).entries.map((entry) => entry.adKey)).toEqual(["recent"]);
    });
  });

  it("shows the notice once more to a user who acknowledged version 1, with the history point", async () => {
    const user = userEvent.setup();
    const store = createMemoryStore({
      [STORAGE_KEYS.privacyNoticeVersion]: 1,
      [STORAGE_KEYS.activeProfile]: smallProfile(),
    });
    render(<App deps={deps({ store })} />);

    expect(await screen.findByText(en("privacy_point_history"))).toBeTruthy();
    await user.click(screen.getByRole("button", { name: en("privacy_acknowledge") }));

    expect(await screen.findByRole("button", { name: en("generate_button") })).toBeTruthy();
    expect(await store.get(STORAGE_KEYS.privacyNoticeVersion)).toBe(2);
  });
});

describe("App: history-only mode (intent 005)", () => {
  const en = (key: Parameters<typeof formatMessage>[1], ...subs: string[]) =>
    formatMessage("en", key, subs);
  const NOT_INSTALLED = { lastError: "Specified native messaging host not found." };

  const ownAd = {
    ad: {
      text: "Frontend Developer at Acme",
      url: "https://jobs.example.com/1",
      structuredFields: null,
      isManualSelection: false,
    },
    adKey: "own-ad",
    snapshot: { status: "none" as const },
    pageTitle: "Frontend Developer",
  };

  function historyOnlyDeps(options: {
    store: ReturnType<typeof createMemoryStore>;
    files: ReturnType<typeof createMemoryFileStore>;
    repository: ReturnType<typeof createMemoryHistoryRepository>;
    hostClient: NativeHostClient;
    createHostClient: () => NativeHostClient;
  }) {
    return deps({
      store: options.store,
      files: options.files,
      hostClient: () => options.hostClient,
      createHostClient: options.createHostClient,
      generate: {
        connect: () => {
          throw new Error("no generation in history-only mode");
        },
        pageStateApis: fakePageStateApis(adPageFacts()).apis,
        addSite: () => Promise.resolve({ ok: false, reason: "DENIED" }),
        render: fakeRender().render,
      },
      history: {
        repository: options.repository,
        adKeyOfTab: () => Promise.resolve(null),
        captureOwnCvAd: () => Promise.resolve({ ok: true, ad: ownAd }),
        actions: { openPdf: vi.fn(), openPage: vi.fn(), openUrl: vi.fn() },
      },
    });
  }

  it("works without the helper: setup fails, CV stored, own CV saved, and it is remembered", async () => {
    const user = userEvent.setup({ applyAccept: false });
    const store = createMemoryStore({
      [STORAGE_KEYS.privacyNoticeVersion]: PRIVACY_NOTICE_VERSION,
    });
    const files = createMemoryFileStore();
    const repository = createMemoryHistoryRepository();
    const panelClient = silentClient();
    const request = vi.spyOn(panelClient, "request");
    const createHostClient = vi.fn(() => healthClient(NOT_INSTALLED));
    const panelDeps = historyOnlyDeps({
      store,
      files,
      repository,
      hostClient: panelClient,
      createHostClient,
    });
    const { unmount } = render(<App deps={panelDeps} />);

    await user.click(await screen.findByRole("button", { name: en("setup_use_without_helper") }));
    const input = document.querySelector<HTMLInputElement>('input[type="file"]');
    if (!input) throw new Error("no file input");
    await user.upload(input, pdfFile("Moje_CV.pdf"));

    expect(
      await screen.findByRole("button", { name: en("history_home_set_up_helper") }),
    ).toBeTruthy();
    expect(await store.get(STORAGE_KEYS.historyOnly)).toBe(true);
    expect(screen.queryByRole("button", { name: en("generate_button") })).toBeNull();

    await user.click(await screen.findByRole("button", { name: en("own_cv_save") }));
    await user.click(await screen.findByRole("button", { name: en("own_cv_confirm") }));
    expect(await screen.findByText(en("result_saved_to_history"))).toBeTruthy();
    expect(await repository.get("own-ad")).toMatchObject({
      source: "own",
      fileName: "Moje_CV.pdf",
    });

    await user.click(screen.getByRole("button", { name: en("history_title") }));
    expect(await screen.findByText(en("history_source_own"))).toBeTruthy();

    // Reopened: straight to history-only home, with no setup check.
    unmount();
    createHostClient.mockClear();
    render(<App deps={panelDeps} />);
    expect(
      await screen.findByRole("button", { name: en("history_home_set_up_helper") }),
    ).toBeTruthy();
    expect(createHostClient).not.toHaveBeenCalled();
    expect(request).not.toHaveBeenCalled();
  });

  it("shows Your CV in Settings in this mode", async () => {
    const user = userEvent.setup();
    const files = createMemoryFileStore();
    await files.set(FILE_KEYS.cvOriginal, pdfFile("Moje_CV.pdf"));
    render(
      <App
        deps={historyOnlyDeps({
          store: createMemoryStore({
            [STORAGE_KEYS.privacyNoticeVersion]: PRIVACY_NOTICE_VERSION,
            [STORAGE_KEYS.historyOnly]: true,
          }),
          files,
          repository: createMemoryHistoryRepository(),
          hostClient: silentClient(),
          createHostClient: () => healthClient(NOT_INSTALLED),
        })}
      />,
    );

    await user.click(await screen.findByRole("button", { name: en("settings_title") }));

    expect(await screen.findByText(en("your_cv_stored", "Moje_CV.pdf"))).toBeTruthy();
  });

  it("sets up the helper later: check, profile from the stored CV, editor; history kept", async () => {
    const user = userEvent.setup();
    const files = createMemoryFileStore();
    await files.set(FILE_KEYS.cvOriginal, pdfFile("Moje_CV.pdf"));
    const repository = createMemoryHistoryRepository();
    await repository.put(historyEntry({ source: "own" }), {
      pdf: new Blob(["%PDF"]),
      adText: "ad",
    });
    const requests: string[] = [];
    const hostClient: NativeHostClient = {
      request: (payload) => {
        requests.push(payload.type);
        if (payload.type === "extractPdfText") {
          return Promise.resolve({
            text: "Jan Testowy, frontend developer.",
            pageCount: 1,
          } as never);
        }
        if (payload.type === "createProfile") return Promise.resolve(draftContent() as never);
        return new Promise(() => undefined);
      },
      disconnect: () => undefined,
    };
    const store = createMemoryStore({
      [STORAGE_KEYS.privacyNoticeVersion]: PRIVACY_NOTICE_VERSION,
      [STORAGE_KEYS.historyOnly]: true,
    });
    let isInstalled = false;
    render(
      <App
        deps={historyOnlyDeps({
          store,
          files,
          repository,
          hostClient,
          createHostClient: () => healthClient(isInstalled ? { report: HEALTHY } : NOT_INSTALLED),
        })}
      />,
    );

    // Still not installed: back to history-only home.
    await user.click(await screen.findByRole("button", { name: en("history_home_set_up_helper") }));
    await screen.findByRole("alert");
    await user.click(screen.getByRole("button", { name: en("action_back") }));
    isInstalled = true;
    await user.click(await screen.findByRole("button", { name: en("history_home_set_up_helper") }));
    await user.click(await screen.findByRole("button", { name: en("setup_continue") }));
    await user.click(await screen.findByRole("button", { name: en("upload_from_stored") }));

    expect(await screen.findByRole("heading", { name: en("editor_title_review") })).toBeTruthy();
    expect(requests).toEqual(["extractPdfText", "createProfile"]);
    expect(files.files.get(FILE_KEYS.cvOriginal)).toBeDefined();
    expect((await repository.list()).entries).toHaveLength(1);
  });

  it("imports a history-only backup on a clean panel and opens history-only home", async () => {
    const user = userEvent.setup({ applyAccept: false });
    const store = createMemoryStore({
      [STORAGE_KEYS.privacyNoticeVersion]: PRIVACY_NOTICE_VERSION,
    });
    const repository = createMemoryHistoryRepository();
    const backup = await buildBackupFile(null, null, {
      entries: [historyEntry({ adKey: "own-ad", source: "own", snapshot: "none" })],
      files: () => Promise.resolve({ pdf: new Blob(["%PDF-own"]), snapshot: null, adText: "ad" }),
    });
    render(
      <App
        deps={historyOnlyDeps({
          store,
          files: createMemoryFileStore(),
          repository,
          hostClient: silentClient(),
          createHostClient: () => healthClient(NOT_INSTALLED),
        })}
      />,
    );

    await user.click(await screen.findByRole("button", { name: en("settings_title") }));
    await user.upload(
      await screen.findByLabelText(en("backup_import")),
      new File([await backup.text()], "cv-snap-backup.json", { type: "application/json" }),
    );
    const dialog = await screen.findByRole("alertdialog");
    await user.click(within(dialog).getByRole("button", { name: en("backup_import") }));
    await screen.findByText(en("backup_imported_history_only", "1"));
    await user.click(screen.getByRole("button", { name: en("settings_back") }));

    expect(
      await screen.findByRole("button", { name: en("history_home_set_up_helper") }),
    ).toBeTruthy();
    expect(await store.get(STORAGE_KEYS.historyOnly)).toBe(true);
    expect((await repository.get("own-ad"))?.source).toBe("own");
  });

  it("is never on next to a profile: the flag is cleared and home has Generate", async () => {
    const store = createMemoryStore({
      [STORAGE_KEYS.privacyNoticeVersion]: PRIVACY_NOTICE_VERSION,
      [STORAGE_KEYS.activeProfile]: smallProfile(),
      [STORAGE_KEYS.historyOnly]: true,
    });
    render(
      <App
        deps={historyOnlyDeps({
          store,
          files: createMemoryFileStore(),
          repository: createMemoryHistoryRepository(),
          hostClient: silentClient(),
          createHostClient: () => healthClient(NOT_INSTALLED),
        })}
      />,
    );

    expect(await screen.findByRole("button", { name: en("generate_button") })).toBeTruthy();
    await waitFor(async () => {
      expect(await store.get(STORAGE_KEYS.historyOnly)).toBeUndefined();
    });
  });
});
