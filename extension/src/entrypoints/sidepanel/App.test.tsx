import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { createNativeHostClient, type NativePort } from "@/lib/native-host-client";
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
import { draftContent, HEALTHY, healthClient } from "../../../test/panel-fixtures";
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

  it("reopens the notice from the header and returns to home", async () => {
    const user = userEvent.setup();
    const store = createMemoryStore({
      ...acknowledged,
      [STORAGE_KEYS.activeProfile]: smallProfile(),
    });
    render(<App deps={deps({ store })} />);
    await screen.findByRole("heading", { name: en("home_title") });

    await user.click(screen.getByRole("button", { name: en("privacy_link") }));
    expect(await screen.findByRole("heading", { name: en("privacy_title") })).toBeTruthy();
    await user.click(screen.getByRole("button", { name: en("privacy_close") }));

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
});
