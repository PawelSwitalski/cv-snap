import type { GenerationResult } from "@/features/generation/generation-result";
import {
  HISTORY_SCHEMA_VERSION,
  type EntrySource,
  type HistoryEntry,
  type SnapshotStatus,
} from "./history-entry";
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
  const snapshot: CapturedSnapshot =
    pending !== null
      ? { status: "saved", html: pending }
      : // "saved" without a pending copy: it was taken by an earlier download of this result.
        { status: ad.snapshot === "saved" ? "none" : ad.snapshot };

  await putEntry(history, existing, {
    adKey: ad.adKey,
    title: result.requirements.title,
    company: result.requirements.company,
    url: ad.url,
    isManualSelection: ad.isManualSelection,
    outputLanguage: result.outputLanguage.code,
    fileName,
    source: "tailored",
    pdf,
    adText: ad.text,
    snapshot,
    now,
  });
  return "saved";
}

/** The cleaned page of this capture, or why there is none. */
export type CapturedSnapshot =
  { status: "saved"; html: string } | { status: Exclude<SnapshotStatus, "saved"> };

export interface EntryContent extends Pick<
  HistoryEntry,
  "adKey" | "title" | "company" | "url" | "isManualSelection" | "outputLanguage" | "fileName"
> {
  source: EntrySource;
  pdf: Blob;
  adText: string;
  snapshot: CapturedSnapshot;
  now: Date;
}

/**
 * Writes one entry, tailored or own (intent 005), with the rules both share: the created and sent
 * dates of an existing entry survive, and a capture without a page snapshot keeps the stored one.
 */
export async function putEntry(
  history: HistoryRepository,
  existing: HistoryEntry | null,
  content: EntryContent,
): Promise<HistoryEntry> {
  const encoder = new TextEncoder();
  const { snapshot } = content;
  const stored: { status: SnapshotStatus; bytes: number; html: string | null | undefined } =
    snapshot.status === "saved"
      ? { status: "saved", bytes: encoder.encode(snapshot.html).byteLength, html: snapshot.html }
      : existing?.snapshot === "saved"
        ? { status: "saved", bytes: existing.sizes.snapshot, html: undefined }
        : { status: snapshot.status, bytes: 0, html: null };

  const timestamp = content.now.toISOString();
  const entry: HistoryEntry = {
    schemaVersion: HISTORY_SCHEMA_VERSION,
    adKey: content.adKey,
    title: content.title,
    company: content.company,
    url: content.url,
    isManualSelection: content.isManualSelection,
    outputLanguage: content.outputLanguage,
    fileName: content.fileName,
    createdAt: existing?.createdAt ?? timestamp,
    lastDownloadedAt: timestamp,
    sentOn: existing?.sentOn ?? null,
    snapshot: stored.status,
    source: content.source,
    sizes: {
      pdf: content.pdf.size,
      snapshot: stored.bytes,
      adText: encoder.encode(content.adText).byteLength,
    },
  };
  await history.put(entry, { pdf: content.pdf, adText: content.adText, snapshot: stored.html });
  return entry;
}
