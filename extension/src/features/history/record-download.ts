import type { GenerationResult } from "@/features/generation/generation-result";
import { HISTORY_SCHEMA_VERSION, type HistoryEntry, type SnapshotStatus } from "./history-entry";
import type { HistoryRepository, PendingSnapshots } from "./history-repository";

export interface RecordDownloadInput {
  result: GenerationResult;
  fileName: string;
  /** Exactly the bytes that were downloaded (FR-1). */
  pdf: Blob;
  now: Date;
}

/** `skipped`: a result restored from a 0.1.x session, which doesn't know its ad. */
export type RecordDownloadOutcome = "saved" | "skipped";

/**
 * Download PDF saves the CV to history (story 002-save-on-download): one entry per ad, created on
 * the first download and replaced by later ones. The created date and the sent date survive a
 * re-download; the pending page snapshot from this capture moves into the entry, and a capture
 * without one keeps the snapshot the entry already has.
 */
export async function recordDownload(
  history: HistoryRepository & Pick<PendingSnapshots, "takePending">,
  { result, fileName, pdf, now }: RecordDownloadInput,
): Promise<RecordDownloadOutcome> {
  const { ad } = result;
  if (!ad) return "skipped";

  const [existing, pending] = await Promise.all([
    history.get(ad.adKey),
    ad.snapshot === "saved" ? history.takePending(ad.adKey) : Promise.resolve(null),
  ]);
  const encoder = new TextEncoder();
  const snapshot: { status: SnapshotStatus; bytes: number; html: string | null | undefined } =
    pending !== null
      ? { status: "saved", bytes: encoder.encode(pending).byteLength, html: pending }
      : existing?.snapshot === "saved"
        ? { status: "saved", bytes: existing.sizes.snapshot, html: undefined }
        : // "saved" without a pending copy: it was taken by an earlier download of this result.
          { status: ad.snapshot === "saved" ? "none" : ad.snapshot, bytes: 0, html: null };

  const timestamp = now.toISOString();
  const entry: HistoryEntry = {
    schemaVersion: HISTORY_SCHEMA_VERSION,
    adKey: ad.adKey,
    title: result.requirements.title,
    company: result.requirements.company,
    url: ad.url,
    isManualSelection: ad.isManualSelection,
    outputLanguage: result.outputLanguage.code,
    fileName,
    createdAt: existing?.createdAt ?? timestamp,
    lastDownloadedAt: timestamp,
    sentOn: existing?.sentOn ?? null,
    snapshot: snapshot.status,
    sizes: { pdf: pdf.size, snapshot: snapshot.bytes, adText: encoder.encode(ad.text).byteLength },
  };
  await history.put(entry, { pdf, adText: ad.text, snapshot: snapshot.html });
  return "saved";
}
