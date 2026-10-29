import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { smallProfile } from "../../../test/cv-fixtures";
import {
  fabricatedPlan,
  fakeConnector,
  fakeRender,
  generationResult,
} from "../../../test/generate-fixtures";
import { I18nProvider } from "@/lib/i18n/i18n";
import { formatMessage, type MessageKey } from "@/lib/i18n/messages";
import { createMemoryStore } from "@/lib/storage/local-store";
import { DEFAULT_GDPR_CLAUSE_SETTINGS } from "@/features/cv-pdf/gdpr-clause";
import ResultView from "./ResultView";
import { createGenerateStore } from "./store";

const en = (key: MessageKey, ...subs: string[]) => formatMessage("en", key, subs);

function setup(result = generationResult()) {
  const store = createGenerateStore({ connect: fakeConnector().connect });
  const renderer = fakeRender();
  const download = vi.fn<(pdf: Blob, fileName: string) => void>();
  render(
    <I18nProvider store={createMemoryStore()} browserLanguage="en-US">
      <ResultView
        store={store}
        result={result}
        profile={smallProfile()}
        photo={() => Promise.resolve(undefined)}
        gdprClause={DEFAULT_GDPR_CLAUSE_SETTINGS}
        render={renderer.render}
        download={download}
      />
    </I18nProvider>,
  );
  return { store, renderer, download, user: userEvent.setup() };
}

const downloadButton = () =>
  screen.getByRole<HTMLButtonElement>("button", { name: en("result_download") });

describe("ResultView", () => {
  it("downloads the PDF fitted from the model on screen, named after the person and company", async () => {
    const ctx = setup();
    await waitFor(() => {
      expect(downloadButton().disabled).toBe(false);
    });

    await ctx.user.click(downloadButton());

    expect(ctx.download).toHaveBeenCalledTimes(1);
    const [pdf, fileName] = ctx.download.mock.calls[0] ?? [];
    expect(pdf).toBe(ctx.renderer.pdfs.at(-1));
    expect(fileName).toBe("CV_Jan_Testowy_Acme_Test.pdf");
  });

  it("doesn't offer a PDF that no longer matches the preview while an edit is re-fitted", async () => {
    const ctx = setup();
    await waitFor(() => {
      expect(downloadButton().disabled).toBe(false);
    });

    act(() => {
      ctx.store.getState().removeLine("skills[0]");
    });

    expect(downloadButton().disabled).toBe(true);
    await waitFor(() => {
      expect(downloadButton().disabled).toBe(false);
    });
    const lastRendered = ctx.renderer.rendered.at(-1);
    const skills = lastRendered?.sections.find((section) => section.key === "skills");
    expect(skills?.entries[0]?.bullets).toEqual(["TypeScript"]);
  });

  it("warns strongly before downloading a CV whose every line is unverified", async () => {
    const plan = fabricatedPlan();
    plan.summary = [];
    plan.skills = [];
    const ctx = setup(generationResult(plan));
    await waitFor(() => {
      expect(downloadButton().disabled).toBe(false);
    });

    await ctx.user.click(downloadButton());
    const dialog = await screen.findByRole("alertdialog");
    expect(dialog.textContent).toContain(en("result_all_unverified_title"));
    expect(ctx.download).not.toHaveBeenCalled();

    await ctx.user.click(
      within(dialog).getByRole("button", { name: en("result_all_unverified_download") }),
    );
    expect(ctx.download).toHaveBeenCalledTimes(1);
  });

  it("downloads without a warning when some lines are verified", async () => {
    const ctx = setup(generationResult(fabricatedPlan()));
    await waitFor(() => {
      expect(downloadButton().disabled).toBe(false);
    });

    await ctx.user.click(downloadButton());

    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(ctx.download).toHaveBeenCalledTimes(1);
  });

  it("says when the PDF couldn't be prepared instead of spinning", async () => {
    const store = createGenerateStore({ connect: fakeConnector().connect });
    render(
      <I18nProvider store={createMemoryStore()} browserLanguage="en-US">
        <ResultView
          store={store}
          result={generationResult()}
          profile={smallProfile()}
          photo={() => Promise.resolve(undefined)}
          gdprClause={DEFAULT_GDPR_CLAUSE_SETTINGS}
          render={() => Promise.reject(new Error("font missing"))}
        />
      </I18nProvider>,
    );

    expect(await screen.findByText(en("result_render_failed"))).toBeTruthy();
    expect(downloadButton().disabled).toBe(true);
  });
});
