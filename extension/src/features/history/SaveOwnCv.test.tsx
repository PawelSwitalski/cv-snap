import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { historyEntry } from "../../../test/history-fixtures";
import { pdfFile } from "../../../test/panel-fixtures";
import type { PageState } from "@/features/generate/page-state";
import { I18nProvider } from "@/lib/i18n/i18n";
import { formatMessage, type MessageKey } from "@/lib/i18n/messages";
import { createMemoryStore } from "@/lib/storage/local-store";
import type { CaptureOwnCvAdResult } from "./capture-own-cv-ad";
import type { HistoryEntry } from "./history-entry";
import { createMemoryHistoryRepository } from "./history-repository";
import type { OwnCvAd } from "./record-own-cv";
import { SaveOwnCv } from "./SaveOwnCv";
import { createHistoryStore } from "./store";

const en = (key: MessageKey, ...subs: string[]) => formatMessage("en", key, subs);

const AD_KEY = historyEntry().adKey;
const DETECTED: PageState = { kind: "ad-detected", tabId: 7, url: "https://jobs.example.com/1" };

const capturedAd = (): OwnCvAd => ({
  ad: {
    text: "Frontend Developer at Acme",
    url: "https://jobs.example.com/1",
    structuredFields: { title: "Frontend Developer", company: "Acme", description: null },
    isManualSelection: false,
  },
  adKey: AD_KEY,
  snapshot: { status: "saved", html: "<html>ad</html>" },
  pageTitle: "Jobs",
});

async function setup(
  options: {
    pageState?: PageState;
    storedCv?: Blob;
    entries?: HistoryEntry[];
    capture?: CaptureOwnCvAdResult;
  } = {},
) {
  const repository = createMemoryHistoryRepository();
  for (const entry of options.entries ?? []) {
    await repository.put(entry, { pdf: new Blob(["%PDF"]), adText: "ad" });
  }
  const store = createHistoryStore(repository);
  await store.getState().load();
  const captureAd = vi.fn(() =>
    Promise.resolve<CaptureOwnCvAdResult>(options.capture ?? { ok: true, ad: capturedAd() }),
  );
  const onShowEntry = vi.fn();
  render(
    <I18nProvider store={createMemoryStore()} browserLanguage="en-US">
      <SaveOwnCv
        pageState={options.pageState ?? DETECTED}
        deps={{
          captureAd,
          storedCv: () => Promise.resolve(options.storedCv),
          store,
          onShowEntry,
        }}
      />
    </I18nProvider>,
  );
  return { repository, store, captureAd, onShowEntry, user: userEvent.setup() };
}

const saveButton = () => screen.findByRole("button", { name: en("own_cv_save") });
const chooseInput = () => screen.getByLabelText<HTMLInputElement>(en("own_cv_choose"));
const bytesOf = async (blob: Blob | null) =>
  blob ? Array.from(new Uint8Array(await blob.arrayBuffer())) : null;

describe("SaveOwnCv", () => {
  it("saves the stored CV for the ad with the prefilled, edited title and company", async () => {
    const stored = pdfFile("Moje_CV.pdf");
    const ctx = await setup({ storedCv: stored });

    await ctx.user.click(await saveButton());
    const title = await screen.findByLabelText<HTMLInputElement>(en("own_cv_title_label"));
    const company = screen.getByLabelText<HTMLInputElement>(en("own_cv_company_label"));
    expect(title.value).toBe("Frontend Developer");
    expect(company.value).toBe("Acme");
    expect(screen.getByText(en("own_cv_file", "Moje_CV.pdf"))).toBeTruthy();
    await ctx.user.clear(company);
    await ctx.user.type(company, "Acme Polska");
    await ctx.user.click(screen.getByRole("button", { name: en("own_cv_confirm") }));

    expect(await screen.findByText(en("result_saved_to_history"))).toBeTruthy();
    expect(ctx.captureAd).toHaveBeenCalledWith(7);
    expect(await ctx.repository.get(AD_KEY)).toMatchObject({
      source: "own",
      title: "Frontend Developer",
      company: "Acme Polska",
      fileName: "Moje_CV.pdf",
    });
    expect(await bytesOf(await ctx.repository.getPdf(AD_KEY))).toEqual(await bytesOf(stored));
    await ctx.user.click(screen.getByRole("button", { name: en("hint_show") }));
    expect(ctx.onShowEntry).toHaveBeenCalledWith(AD_KEY);
  });

  it("saves a picked PDF instead, and offers only that without a stored CV", async () => {
    const ctx = await setup();
    await screen.findByRole("button", { name: en("own_cv_choose") });
    expect(screen.queryByRole("button", { name: en("own_cv_save") })).toBeNull();

    await ctx.user.upload(chooseInput(), pdfFile("Inne_CV.pdf"));
    await ctx.user.click(await screen.findByRole("button", { name: en("own_cv_confirm") }));

    await screen.findByText(en("result_saved_to_history"));
    expect((await ctx.repository.get(AD_KEY))?.fileName).toBe("Inne_CV.pdf");
  });

  it("checks a picked file like a CV upload and saves nothing for a wrong one", async () => {
    const ctx = await setup({ storedCv: pdfFile() });
    await saveButton();

    await ctx.user.upload(
      chooseInput(),
      new File(["hello"], "cv.pdf", { type: "application/pdf" }),
    );

    expect((await screen.findByRole("alert")).textContent).toContain(en("upload_error_not_pdf"));
    expect(ctx.captureAd).not.toHaveBeenCalled();
    expect((await ctx.repository.list()).entries).toEqual([]);
  });

  it("asks before replacing a tailored CV, and keeps it on Keep", async () => {
    const ctx = await setup({ storedCv: pdfFile(), entries: [historyEntry()] });

    await ctx.user.click(await saveButton());
    await ctx.user.click(await screen.findByRole("button", { name: en("own_cv_confirm") }));
    expect(await screen.findByRole("alertdialog")).toBeTruthy();
    await ctx.user.click(screen.getByRole("button", { name: en("own_cv_replace_keep") }));

    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect((await ctx.repository.get(AD_KEY))?.source).toBeUndefined();

    await ctx.user.click(screen.getByRole("button", { name: en("own_cv_confirm") }));
    await ctx.user.click(await screen.findByRole("button", { name: en("own_cv_replace_confirm") }));
    await waitFor(async () => {
      expect((await ctx.repository.get(AD_KEY))?.source).toBe("own");
    });
  });

  it("replaces an earlier own CV without asking", async () => {
    const ctx = await setup({ storedCv: pdfFile(), entries: [historyEntry({ source: "own" })] });

    await ctx.user.click(await saveButton());
    await ctx.user.click(await screen.findByRole("button", { name: en("own_cv_confirm") }));

    await screen.findByText(en("result_saved_to_history"));
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });

  it("shows the capture problem the way Generate does", async () => {
    const ctx = await setup({
      storedCv: pdfFile(),
      capture: { ok: false, reason: "SELECTION_TOO_SHORT" },
    });

    await ctx.user.click(await saveButton());

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain(en("error_SELECTION_TOO_SHORT"));
    expect(alert.textContent).toContain(en("fix_SELECTION_TOO_SHORT"));
  });

  it("reports a failed save and leaves nothing in history", async () => {
    const ctx = await setup({ storedCv: pdfFile() });
    vi.spyOn(ctx.repository, "put").mockRejectedValueOnce(new Error("quota"));

    await ctx.user.click(await saveButton());
    await ctx.user.click(await screen.findByRole("button", { name: en("own_cv_confirm") }));

    expect((await screen.findByRole("alert")).textContent).toContain(en("own_cv_failed"));
    expect((await ctx.repository.list()).entries).toEqual([]);
  });

  it.each<[string, PageState]>([
    ["no tab", { kind: "no-tab" }],
    ["a site that isn't allowed", { kind: "site-not-allowed", tabId: 7, url: "https://a.pl" }],
    ["a page that isn't https", { kind: "unsupported", tabId: 7 }],
  ])("is hidden for %s", async (_label, pageState) => {
    await setup({ pageState, storedCv: pdfFile() });

    await waitFor(() => {
      expect(screen.queryByRole("button", { name: en("own_cv_choose") })).toBeNull();
    });
  });
});
