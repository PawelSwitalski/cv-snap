import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { I18nProvider } from "@/lib/i18n/i18n";
import { formatMessage, type MessageKey } from "@/lib/i18n/messages";
import { createMemoryFileStore, FILE_KEYS } from "@/lib/storage/file-store";
import { createMemoryStore } from "@/lib/storage/local-store";
import { bytesFile, PNG_HEAD, pdfFile } from "../../../test/panel-fixtures";
import { YourCvSection } from "./YourCvSection";

const en = (key: MessageKey, ...subs: string[]) => formatMessage("en", key, subs);

async function setup(stored?: File) {
  const files = createMemoryFileStore();
  if (stored) await files.set(FILE_KEYS.cvOriginal, stored);
  render(
    <I18nProvider store={createMemoryStore()} browserLanguage="en-US">
      <YourCvSection deps={{ files }} />
    </I18nProvider>,
  );
  return { files, user: userEvent.setup({ applyAccept: false }) };
}

const input = () => screen.getByLabelText<HTMLInputElement>(en("your_cv_replace"));

describe("YourCvSection", () => {
  it("shows the stored CV and replaces it with a valid PDF", async () => {
    const ctx = await setup(pdfFile("Stare_CV.pdf"));
    expect(await screen.findByText(en("your_cv_stored", "Stare_CV.pdf"))).toBeTruthy();

    const next = pdfFile("Nowe_CV.pdf");
    await ctx.user.upload(input(), next);

    expect(await screen.findByText(en("your_cv_stored", "Nowe_CV.pdf"))).toBeTruthy();
    expect(screen.getByRole("status").textContent).toBe(en("your_cv_replaced"));
    expect(ctx.files.files.get(FILE_KEYS.cvOriginal)).toBe(next);
  });

  it("keeps the stored CV when the new file is wrong", async () => {
    const stored = pdfFile("Stare_CV.pdf");
    const ctx = await setup(stored);
    await screen.findByText(en("your_cv_stored", "Stare_CV.pdf"));

    await ctx.user.upload(input(), bytesFile(PNG_HEAD, "me.png", "image/png"));

    expect((await screen.findByRole("alert")).textContent).toBe(en("upload_error_not_pdf"));
    expect(ctx.files.files.get(FILE_KEYS.cvOriginal)).toBe(stored);
  });

  it("says when no CV is stored", async () => {
    await setup();

    expect(await screen.findByText(en("your_cv_none"))).toBeTruthy();
  });
});
