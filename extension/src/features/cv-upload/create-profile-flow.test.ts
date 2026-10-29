import { CvSnapError, type CvProfileContent } from "@cv-snap/shared";
import { describe, expect, it } from "vitest";
import type { ProfileExtraction } from "@/features/tailoring/profile-extraction";
import type { NativeHostClient } from "@/lib/native-host-client";
import { createMemoryFileStore, FILE_KEYS } from "@/lib/storage/file-store";
import { draftContent, pdfFile } from "../../../test/panel-fixtures";
import {
  createProfileFromPdf,
  type CreateProfileDeps,
  type UploadStep,
} from "./create-profile-flow";

function deps(onRequest?: (payload: { type: string; pdfBase64?: string }) => void) {
  const saved: CvProfileContent[] = [];
  const texts: string[] = [];
  const value: CreateProfileDeps = {
    client: {
      request: (payload: { type: string; pdfBase64?: string }) => {
        onRequest?.(payload);
        return Promise.resolve({ text: "Jan Testowy, Frontend Developer", pageCount: 1 });
      },
      disconnect: () => undefined,
    } as unknown as NativeHostClient,
    extraction: {
      createDraft: (text: string) => {
        texts.push(text);
        return Promise.resolve(draftContent());
      },
    } as unknown as ProfileExtraction,
    files: createMemoryFileStore(),
    saveDraft: (draft) => {
      saved.push(draft);
      return Promise.resolve();
    },
  };
  return { value, saved, texts };
}

describe("createProfileFromPdf", () => {
  it("stores the original, sends it as base64, builds and saves the draft, in that order", async () => {
    const steps: UploadStep[] = [];
    let sentBase64 = "";
    const { value, saved, texts } = deps((payload) => {
      sentBase64 = payload.pdfBase64 ?? "";
    });

    const draft = await createProfileFromPdf(pdfFile(), "claude-haiku-5-5", value, {
      signal: new AbortController().signal,
      onStep: (step) => steps.push(step),
    });

    expect(steps).toEqual(["storing", "extracting-pdf-text", "creating-profile"]);
    expect(await value.files.get(FILE_KEYS.cvOriginal)).toBeDefined();
    expect(atob(sentBase64).startsWith("%PDF-")).toBe(true);
    expect(texts).toEqual(["Jan Testowy, Frontend Developer"]);
    expect(saved).toEqual([draft]);
  });

  it("saves no draft when cancelled before the profile is built", async () => {
    const controller = new AbortController();
    const { value, saved } = deps(() => {
      controller.abort();
    });

    await expect(
      createProfileFromPdf(pdfFile(), "claude-haiku-5-5", value, {
        signal: controller.signal,
        onStep: () => undefined,
      }),
    ).rejects.toMatchObject({ code: "CANCELLED" });
    expect(saved).toEqual([]);
  });

  it("passes host errors through unchanged, saving nothing", async () => {
    const { value, saved } = deps();
    const failing: NativeHostClient = {
      request: () =>
        Promise.reject(new CvSnapError("PDF_PARSE_FAILED", "no text", { reason: "NO_TEXT" })),
      disconnect: () => undefined,
    };
    value.client = failing;

    await expect(
      createProfileFromPdf(pdfFile(), "claude-haiku-5-5", value, {
        signal: new AbortController().signal,
        onStep: () => undefined,
      }),
    ).rejects.toMatchObject({ code: "PDF_PARSE_FAILED", reason: "NO_TEXT" });
    expect(saved).toEqual([]);
  });
});
