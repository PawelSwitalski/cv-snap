import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import {
  createNativeHostClient,
  type NativeHostClient,
  type NativePort,
} from "@/lib/native-host-client";
import { createMemoryFileStore } from "@/lib/storage/file-store";
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
