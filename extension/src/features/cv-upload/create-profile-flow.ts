import { CvSnapError, type CvProfileContent, type ModelId } from "@cv-snap/shared";
import type { ProfileExtraction } from "@/features/tailoring/profile-extraction";
import { blobToBase64 } from "@/lib/file-checks";
import { logger } from "@/lib/logger";
import type { NativeHostClient } from "@/lib/native-host-client";
import { FILE_KEYS, type FileStore } from "@/lib/storage/file-store";

export type UploadStep = "storing" | "extracting-pdf-text" | "creating-profile";

export interface CreateProfileDeps {
  client: NativeHostClient;
  extraction: ProfileExtraction;
  files: FileStore;
  saveDraft: (draft: CvProfileContent) => Promise<void>;
}

/**
 * Upload → draft profile (story 003): store the original PDF, extract its text on the host, let
 * Claude build the draft, and only then save it. A cancelled or failed run saves no draft.
 * The PDF goes to the host as base64 in one message (well under the 64 MB limit).
 */
export async function createProfileFromPdf(
  file: File,
  model: ModelId,
  deps: CreateProfileDeps,
  options: { signal: AbortSignal; onStep: (step: UploadStep) => void },
): Promise<CvProfileContent> {
  const { signal, onStep } = options;
  const throwIfCancelled = () => {
    if (signal.aborted) throw new CvSnapError("CANCELLED", "Upload was cancelled");
  };

  onStep("storing");
  await deps.files.set(FILE_KEYS.cvOriginal, file);
  throwIfCancelled();

  onStep("extracting-pdf-text");
  const { text, pageCount } = await deps.client.request<"extractPdfText">(
    { type: "extractPdfText", pdfBase64: await blobToBase64(file) },
    { signal },
  );
  throwIfCancelled();
  logger.info("cv text extracted", { pageCount, chars: text.length });

  onStep("creating-profile");
  const draft = await deps.extraction.createDraft(text, { model, signal });
  throwIfCancelled();

  await deps.saveDraft(draft);
  return draft;
}
