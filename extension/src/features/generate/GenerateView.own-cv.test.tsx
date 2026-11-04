import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { smallProfile } from "../../../test/cv-fixtures";
import {
  adPageFacts,
  fakeConnector,
  fakePageStateApis,
  fakeRender,
  generationResult,
} from "../../../test/generate-fixtures";
import { historyEntry } from "../../../test/history-fixtures";
import { pdfFile } from "../../../test/panel-fixtures";
import type { GenerationResult } from "@/features/generation/generation-result";
import { createMemoryHistoryRepository } from "@/features/history/history-repository";
import { createHistoryStore } from "@/features/history/store";
import { createSettingsStore } from "@/features/settings/store";
import { I18nProvider } from "@/lib/i18n/i18n";
import { formatMessage, type MessageKey } from "@/lib/i18n/messages";
import { createMemoryStore } from "@/lib/storage/local-store";
import { GenerateView } from "./GenerateView";
import { createGenerateStore } from "./store";

const en = (key: MessageKey, ...subs: string[]) => formatMessage("en", key, subs);
const AD_KEY = historyEntry().adKey;

const resultWithAd = (): GenerationResult => ({
  ...generationResult(),
  ad: {
    adKey: AD_KEY,
    url: "https://jobs.example.com/1",
    text: "Frontend Developer at Acme",
    isManualSelection: false,
    snapshot: "none",
  },
});

async function setup(options: { ownCv?: boolean } = {}) {
  const repository = createMemoryHistoryRepository();
  await repository.put(historyEntry({ source: "own", fileName: "Moje_CV.pdf" }), {
    pdf: new Blob(["%PDF-own"]),
    adText: "ad",
  });
  const history = createHistoryStore(repository);
  const connector = fakeConnector();
  render(
    <I18nProvider store={createMemoryStore()} browserLanguage="en-US">
      <GenerateView
        profile={smallProfile()}
        deps={{
          store: createGenerateStore({ connect: connector.connect }),
          pageStateApis: fakePageStateApis(adPageFacts()).apis,
          addSite: () => Promise.resolve({ ok: false, reason: "DENIED" }),
          photo: () => Promise.resolve(undefined),
          settings: createSettingsStore(createMemoryStore()),
          render: fakeRender().render,
          history: {
            store: history,
            adKeyOfTab: () => Promise.resolve(null),
            onShowEntry: vi.fn(),
            ...(options.ownCv
              ? {
                  ownCv: {
                    captureAd: vi.fn(() =>
                      Promise.resolve({
                        ok: false as const,
                        reason: "JOB_AD_NOT_DETECTED" as const,
                      }),
                    ),
                    storedCv: () => Promise.resolve(pdfFile()),
                  },
                }
              : {}),
          },
        }}
      />
    </I18nProvider>,
  );
  const user = userEvent.setup();
  await user.click(await screen.findByRole("button", { name: en("generate_button") }));
  act(() => {
    connector.last().emit({ type: "result", result: resultWithAd() });
  });
  const download = await screen.findByRole<HTMLButtonElement>("button", {
    name: en("result_download"),
  });
  await waitFor(() => {
    expect(download.disabled).toBe(false);
  });
  return { repository, download, user };
}

describe("GenerateView: own CV in history (intent 005)", () => {
  beforeEach(() => {
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:cv");
    vi.spyOn(URL, "revokeObjectURL").mockReturnValue(undefined);
  });

  it("asks before a tailored download replaces the user's own CV, and Keep leaves it", async () => {
    const ctx = await setup();

    await ctx.user.click(ctx.download);
    expect(await screen.findByRole("alertdialog")).toBeTruthy();
    await ctx.user.click(screen.getByRole("button", { name: en("tailored_replace_keep") }));

    await waitFor(() => {
      expect(screen.queryByRole("alertdialog")).toBeNull();
    });
    expect(await ctx.repository.get(AD_KEY)).toMatchObject({
      source: "own",
      fileName: "Moje_CV.pdf",
    });
    expect(screen.queryByText(en("result_saved_to_history"))).toBeNull();
  });

  it("replaces the user's own CV with the tailored one on Replace", async () => {
    const ctx = await setup();

    await ctx.user.click(ctx.download);
    await ctx.user.click(
      await screen.findByRole("button", { name: en("tailored_replace_confirm") }),
    );

    expect(await screen.findByText(en("result_saved_to_history"))).toBeTruthy();
    expect((await ctx.repository.get(AD_KEY))?.source).toBe("tailored");
  });

  it("shows Save my CV to history under Generate when the panel has the own-CV deps", async () => {
    await setup({ ownCv: true });

    expect(await screen.findByRole("button", { name: en("own_cv_save") })).toBeTruthy();
  });
});
