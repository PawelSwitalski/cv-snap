import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { I18nProvider } from "@/lib/i18n/i18n";
import { formatMessage, type MessageKey } from "@/lib/i18n/messages";
import { createMemoryFileStore, FILE_KEYS } from "@/lib/storage/file-store";
import { createMemoryStore } from "@/lib/storage/local-store";
import { bytesFile, PNG_HEAD, pdfFile } from "../../../test/panel-fixtures";
import { StoreCvOnly, storeCvFile } from "./StoreCvOnly";
import { MAX_CV_BYTES } from "./validate-file";

const en = (key: MessageKey) => formatMessage("en", key);

function setup() {
  const files = createMemoryFileStore();
  const onStored = vi.fn();
  const onBack = vi.fn();
  render(
    <I18nProvider store={createMemoryStore()} browserLanguage="en-US">
      <StoreCvOnly files={files} onStored={onStored} onBack={onBack} />
    </I18nProvider>,
  );
  const input = document.querySelector<HTMLInputElement>('input[type="file"]');
  if (!input) throw new Error("no file input");
  return { files, onStored, onBack, input, user: userEvent.setup({ applyAccept: false }) };
}

describe("storeCvFile", () => {
  it("stores a valid PDF as the original CV", async () => {
    const files = createMemoryFileStore();
    const file = pdfFile("Moje_CV.pdf");

    expect(await storeCvFile(files, file)).toBeNull();
    expect(files.files.get(FILE_KEYS.cvOriginal)).toBe(file);
  });

  it.each([
    ["a non-PDF", bytesFile(PNG_HEAD, "me.png", "image/png"), "upload_error_not_pdf"],
    ["a file over 10 MB", pdfFile("big.pdf", MAX_CV_BYTES + 1), "upload_error_too_large"],
    ["an empty file", new File([], "cv.pdf", { type: "application/pdf" }), "upload_error_empty"],
  ] as const)("refuses %s and stores nothing", async (_label, file, message) => {
    const files = createMemoryFileStore();

    expect(await storeCvFile(files, file)).toBe(message);
    expect(files.files.size).toBe(0);
  });

  it("reports a storage error", async () => {
    const files = createMemoryFileStore();
    vi.spyOn(files, "set").mockRejectedValueOnce(new Error("quota"));

    expect(await storeCvFile(files, pdfFile())).toBe("store_cv_failed");
  });
});

describe("StoreCvOnly", () => {
  it("stores the chosen PDF and continues", async () => {
    const ctx = setup();

    await ctx.user.upload(ctx.input, pdfFile("Moje_CV.pdf"));

    await waitFor(() => {
      expect(ctx.onStored).toHaveBeenCalledOnce();
    });
    expect(ctx.files.files.has(FILE_KEYS.cvOriginal)).toBe(true);
  });

  it("shows the upload message for a wrong file and stays", async () => {
    const ctx = setup();

    await ctx.user.upload(ctx.input, bytesFile(PNG_HEAD, "me.png", "image/png"));

    expect((await screen.findByRole("alert")).textContent).toContain(en("upload_error_not_pdf"));
    expect(ctx.onStored).not.toHaveBeenCalled();
  });

  it("goes back without storing anything", async () => {
    const ctx = setup();

    await ctx.user.click(screen.getByRole("button", { name: en("action_back") }));

    expect(ctx.onBack).toHaveBeenCalledOnce();
    expect(ctx.files.files.size).toBe(0);
  });
});
