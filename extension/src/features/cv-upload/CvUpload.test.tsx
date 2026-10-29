import { CvSnapError, type CvProfileContent } from "@cv-snap/shared";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import type { ProfileExtraction } from "@/features/tailoring/profile-extraction";
import { I18nProvider } from "@/lib/i18n/i18n";
import { formatMessage } from "@/lib/i18n/messages";
import type { NativeHostClient } from "@/lib/native-host-client";
import { createMemoryFileStore, FILE_KEYS } from "@/lib/storage/file-store";
import { createMemoryStore } from "@/lib/storage/local-store";
import { bytesFile, draftContent, PNG_HEAD, pdfFile } from "../../../test/panel-fixtures";
import type { CreateProfileDeps } from "./create-profile-flow";
import { CvUpload } from "./CvUpload";
import { MAX_CV_BYTES } from "./validate-file";

const en = (key: Parameters<typeof formatMessage>[1]) => formatMessage("en", key);
const wrap = (ui: ReactNode) => (
  <I18nProvider store={createMemoryStore()} browserLanguage="en-US">
    {ui}
  </I18nProvider>
);

/** Controllable host + extraction: each step waits until the test releases it. */
function fakeDeps(options: { extractError?: CvSnapError } = {}) {
  const files = createMemoryFileStore();
  const saved: CvProfileContent[] = [];
  const requests: string[] = [];
  let releaseExtraction: (() => void) | undefined;
  const client = {
    request: (payload: { type: string }, { signal }: { signal?: AbortSignal } = {}) => {
      requests.push(payload.type);
      return new Promise((resolve, reject) => {
        signal?.addEventListener("abort", () => {
          reject(new CvSnapError("CANCELLED", "cancelled"));
        });
        if (options.extractError) {
          reject(options.extractError);
          return;
        }
        releaseExtraction = () => {
          resolve({ text: "CV text", pageCount: 1 });
        };
      });
    },
    disconnect: () => undefined,
  } as unknown as NativeHostClient;
  const extraction = {
    createDraft: (_text: string, { signal }: { signal: AbortSignal }) =>
      signal.aborted
        ? Promise.reject(new CvSnapError("CANCELLED", "cancelled"))
        : Promise.resolve(draftContent()),
  } as unknown as ProfileExtraction;
  const deps: CreateProfileDeps = {
    client,
    extraction,
    files,
    saveDraft: (draft) => {
      saved.push(draft);
      return Promise.resolve();
    },
  };
  return { deps, files, saved, requests, release: () => releaseExtraction?.() };
}

function chooseFile(file: File) {
  const input = document.querySelector<HTMLInputElement>('input[type="file"]');
  if (!input) throw new Error("no file input");
  fireEvent.change(input, { target: { files: [file] } });
}

describe("CvUpload", () => {
  it("stores the PDF, shows progress and creates the draft", async () => {
    const fake = fakeDeps();
    const onDraftCreated = vi.fn();
    render(
      wrap(
        <CvUpload
          deps={fake.deps}
          model="claude-sonnet-5-5"
          hasActiveProfile={false}
          onDraftCreated={onDraftCreated}
        />,
      ),
    );

    chooseFile(pdfFile());

    expect(await screen.findByText(en("upload_step_extracting"))).toBeTruthy();
    expect(screen.getByRole("progressbar")).toBeTruthy();
    expect(fake.files.files.has(FILE_KEYS.cvOriginal)).toBe(true);
    fake.release();
    await waitFor(() => {
      expect(onDraftCreated).toHaveBeenCalledOnce();
    });
    expect(fake.saved).toHaveLength(1);
    expect(fake.requests).toEqual(["extractPdfText"]);
  });

  it.each([
    ["a non-PDF", bytesFile(PNG_HEAD, "me.png", "image/png"), "upload_error_not_pdf"],
    ["a file over 10 MB", pdfFile("big.pdf", MAX_CV_BYTES + 1), "upload_error_too_large"],
  ] as const)("rejects %s before sending anything", async (_label, file, message) => {
    const fake = fakeDeps();
    render(
      wrap(
        <CvUpload
          deps={fake.deps}
          model="claude-sonnet-5-5"
          hasActiveProfile={false}
          onDraftCreated={vi.fn()}
        />,
      ),
    );

    chooseFile(file);

    expect(await screen.findByText(en(message))).toBeTruthy();
    expect(fake.requests).toEqual([]);
    expect(fake.files.files.size).toBe(0);
  });

  it("says that scanned PDFs aren't supported", async () => {
    const fake = fakeDeps({
      extractError: new CvSnapError("PDF_PARSE_FAILED", "no text", { reason: "NO_TEXT" }),
    });
    render(
      wrap(
        <CvUpload
          deps={fake.deps}
          model="claude-sonnet-5-5"
          hasActiveProfile={false}
          onDraftCreated={vi.fn()}
        />,
      ),
    );

    chooseFile(pdfFile());

    expect(await screen.findByText(en("error_PDF_NO_TEXT"))).toBeTruthy();
    expect(fake.saved).toEqual([]);
  });

  it("cancels: back to the start, no error, no draft saved", async () => {
    const user = userEvent.setup();
    const fake = fakeDeps();
    const onDraftCreated = vi.fn();
    render(
      wrap(
        <CvUpload
          deps={fake.deps}
          model="claude-sonnet-5-5"
          hasActiveProfile={false}
          onDraftCreated={onDraftCreated}
        />,
      ),
    );
    chooseFile(pdfFile());
    await screen.findByText(en("upload_step_extracting"));

    await user.click(screen.getByRole("button", { name: en("upload_cancel") }));

    await waitFor(() => {
      expect(screen.queryByRole("progressbar")).toBeNull();
    });
    expect(screen.queryByRole("alert")).toBeNull();
    expect(onDraftCreated).not.toHaveBeenCalled();
    expect(fake.saved).toEqual([]);
  });

  it("cancels when the panel closes mid-upload, saving no draft", async () => {
    const fake = fakeDeps();
    const onDraftCreated = vi.fn();
    render(
      wrap(
        <CvUpload
          deps={fake.deps}
          model="claude-sonnet-5-5"
          hasActiveProfile={false}
          onDraftCreated={onDraftCreated}
        />,
      ),
    );
    chooseFile(pdfFile());
    await screen.findByText(en("upload_step_extracting"));

    window.dispatchEvent(new Event("pagehide"));
    fake.release();

    await waitFor(() => {
      expect(screen.queryByRole("progressbar")).toBeNull();
    });
    expect(onDraftCreated).not.toHaveBeenCalled();
    expect(fake.saved).toEqual([]);
  });

  it("announces progress in a polite live region", async () => {
    const fake = fakeDeps();
    render(
      wrap(
        <CvUpload
          deps={fake.deps}
          model="claude-sonnet-5-5"
          hasActiveProfile={false}
          onDraftCreated={vi.fn()}
        />,
      ),
    );

    chooseFile(pdfFile());
    const step = await screen.findByText(en("upload_step_extracting"));

    expect(step.closest('[aria-live="polite"]')).not.toBeNull();
  });
});
