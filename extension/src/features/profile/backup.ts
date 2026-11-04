import { CV_PROFILE_SCHEMA_VERSION, CvProfileSchema, type CvProfile } from "@cv-snap/shared";
import { z } from "zod";
import {
  HISTORY_SCHEMA_VERSION,
  HistoryEntrySchema,
  MAX_HISTORY_PDF_BYTES,
  type HistoryEntry,
  type HistoryEntryWithFiles,
  type HistoryFiles,
} from "@/features/history/history-entry";
import { MAX_SNAPSHOT_BYTES } from "@/features/job-ad/snapshot";
import { base64ToBytes, blobToBase64, readHead, startsWith } from "@/lib/file-checks";
import { logger } from "@/lib/logger";
import { validatePhoto } from "./photo";

/**
 * Backup file (story 009, bolt 026): the confirmed profile as JSON, with the photo embedded as
 * base64 only when the user chooses, and optionally the history. `schemaVersion` is the profile
 * schema version and `history.schemaVersion` the history entry version, so a file from a newer
 * cv-snap is recognised and refused instead of being half-read. Without history the file is the
 * 0.1.x format exactly; 0.1.x ignores the `history` field.
 */
export const BACKUP_FORMAT = "cv-snap-profile";

/** Whole file. Base64 adds a third, so this holds roughly 190 MB of history PDFs. */
export const MAX_BACKUP_BYTES = 256 * 1024 * 1024;

/** The photo is at most 2 MB, ~2.7 MB as base64. */
const MAX_PHOTO_BASE64 = 5 * 1024 * 1024;

const PHOTO_TYPES = ["image/jpeg", "image/png"] as const;

const PDF_SIGNATURE = [0x25, 0x50, 0x44, 0x46]; // %PDF

export interface ProfileBackup {
  format: typeof BACKUP_FORMAT;
  schemaVersion: number;
  exportedAt: string;
  profile: CvProfile;
  photo?: { type: (typeof PHOTO_TYPES)[number]; base64: string };
}

/** One history entry in the file: its metadata and its files (only the PDF is base64). */
interface BackupHistoryItem {
  entry: HistoryEntry;
  pdfBase64: string;
  snapshotHtml: string | null;
  adText: string;
}

/** Where the export reads the history from, entry by entry. */
export interface BackupHistorySource {
  entries: readonly HistoryEntry[];
  /** The entry's files; null when they are gone (the entry is then left out). */
  files(adKey: string): Promise<HistoryFiles | null>;
}

export type BackupProblem =
  | "TOO_LARGE"
  | "NOT_JSON"
  | "NOT_A_BACKUP"
  | "NEWER_VERSION"
  | "INVALID"
  | "BAD_PHOTO"
  | "BAD_HISTORY";

export type ParsedBackup =
  | { ok: true; profile: CvProfile; photo: Blob | null; history: HistoryEntryWithFiles[] }
  | { ok: false; problem: BackupProblem };

export async function buildBackup(
  profile: CvProfile,
  photo: Blob | null,
  now: Date = new Date(),
): Promise<ProfileBackup> {
  const backup: ProfileBackup = {
    format: BACKUP_FORMAT,
    schemaVersion: CV_PROFILE_SCHEMA_VERSION,
    exportedAt: now.toISOString(),
    profile: { ...profile, photoRef: photo ? profile.photoRef : null },
  };
  if (photo) {
    backup.photo = {
      type: photo.type === "image/png" ? "image/png" : "image/jpeg",
      base64: await blobToBase64(photo),
    };
  }
  return backup;
}

/**
 * The backup file. With history, the file is assembled from one part per entry, so no single
 * string holds the whole history; without it, it is the 0.1.x file as before.
 */
export async function buildBackupFile(
  profile: CvProfile,
  photo: Blob | null,
  history: BackupHistorySource | null,
  now: Date = new Date(),
): Promise<Blob> {
  const backup = await buildBackup(profile, photo, now);
  if (!history) return new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });

  const items: string[] = [];
  for (const entry of history.entries) {
    const files = await history.files(entry.adKey);
    if (!files) {
      logger.warn("history entry left out of backup: files missing");
      continue;
    }
    const item: BackupHistoryItem = {
      entry,
      pdfBase64: await blobToBase64(files.pdf),
      snapshotHtml: files.snapshot,
      adText: files.adText,
    };
    items.push(JSON.stringify(item));
  }
  // The envelope without its closing brace, then the history, entry by entry.
  const parts = [
    JSON.stringify(backup).slice(0, -1),
    `,"history":{"schemaVersion":${String(HISTORY_SCHEMA_VERSION)},"entries":[`,
  ];
  items.forEach((item, index) => parts.push(index === 0 ? item : `,${item}`));
  parts.push("]}}");
  return new Blob(parts, { type: "application/json" });
}

/** Rough file size before building it (the export asks first above 50 MB). */
export function estimateBackupBytes(entries: readonly HistoryEntry[]): number {
  const PER_ENTRY_OVERHEAD = 1024;
  return entries.reduce(
    (sum, { sizes }) =>
      sum + Math.ceil(sizes.pdf / 3) * 4 + sizes.snapshot + sizes.adText + PER_ENTRY_OVERHEAD,
    0,
  );
}

/** `cv-snap-backup-2026-11-04.json` (local date). */
export function backupFileName(now: Date = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `cv-snap-backup-${String(now.getFullYear())}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.json`;
}

const EnvelopeSchema = z.object({
  format: z.literal(BACKUP_FORMAT),
  schemaVersion: z.number().int().positive(),
  profile: z.unknown(),
  photo: z
    .object({ type: z.enum(PHOTO_TYPES), base64: z.string().max(MAX_PHOTO_BASE64) })
    .optional(),
  history: z.unknown().optional(),
});

const HistoryEnvelopeSchema = z.object({
  schemaVersion: z.number().int().positive(),
  entries: z.array(z.unknown()),
});

const HistoryItemSchema = z.object({
  entry: HistoryEntrySchema,
  pdfBase64: z.string().max(Math.ceil(MAX_HISTORY_PDF_BYTES / 3) * 4),
  snapshotHtml: z.string().nullable(),
  adText: z.string(),
});

/**
 * Reads a backup file. The file comes from outside the extension: everything is validated (the
 * profile with the strict `CvProfileSchema`, the photo by its signature and size, every history
 * entry and its files, FR-5) before the caller writes anything.
 */
export async function parseBackup(file: Blob): Promise<ParsedBackup> {
  if (file.size > MAX_BACKUP_BYTES) return { ok: false, problem: "TOO_LARGE" };
  let raw: unknown;
  try {
    raw = JSON.parse(await file.text());
  } catch {
    return { ok: false, problem: "NOT_JSON" };
  }
  const envelope = EnvelopeSchema.safeParse(raw);
  if (!envelope.success) return { ok: false, problem: "NOT_A_BACKUP" };
  const {
    schemaVersion,
    profile: rawProfile,
    photo: rawPhoto,
    history: rawHistory,
  } = envelope.data;
  if (schemaVersion > CV_PROFILE_SCHEMA_VERSION) return { ok: false, problem: "NEWER_VERSION" };
  const historyEnvelope =
    rawHistory === undefined ? null : HistoryEnvelopeSchema.safeParse(rawHistory);
  if (historyEnvelope && !historyEnvelope.success) return { ok: false, problem: "BAD_HISTORY" };
  if (historyEnvelope && historyEnvelope.data.schemaVersion > HISTORY_SCHEMA_VERSION) {
    return { ok: false, problem: "NEWER_VERSION" };
  }

  const profile = CvProfileSchema.safeParse(rawProfile);
  if (!profile.success || profile.data.confirmedAt === null) {
    return { ok: false, problem: "INVALID" };
  }

  let photo: Blob | null = null;
  if (rawPhoto) {
    try {
      photo = new Blob([base64ToBytes(rawPhoto.base64)], { type: rawPhoto.type });
    } catch {
      return { ok: false, problem: "BAD_PHOTO" };
    }
    if ((await validatePhoto(photo)) !== null) return { ok: false, problem: "BAD_PHOTO" };
  }

  const history = historyEnvelope ? await parseHistory(historyEnvelope.data.entries) : [];
  if (history === null) return { ok: false, problem: "BAD_HISTORY" };
  return { ok: true, profile: profile.data, photo, history };
}

/**
 * Every entry and its files, or null if any is wrong: duplicate ads, a file that isn't a PDF or is
 * too large, a snapshot that doesn't match the entry's status. Sizes are recalculated from the
 * real files rather than trusted.
 */
async function parseHistory(
  rawEntries: readonly unknown[],
): Promise<HistoryEntryWithFiles[] | null> {
  const encoder = new TextEncoder();
  const seen = new Set<string>();
  const items: HistoryEntryWithFiles[] = [];
  for (const raw of rawEntries) {
    const parsed = HistoryItemSchema.safeParse(raw);
    if (!parsed.success) return null;
    const { entry, pdfBase64, snapshotHtml, adText } = parsed.data;
    if (seen.has(entry.adKey)) return null;
    seen.add(entry.adKey);
    if ((entry.snapshot === "saved") !== (snapshotHtml !== null)) return null;

    let pdf: Blob;
    try {
      pdf = new Blob([base64ToBytes(pdfBase64)], { type: "application/pdf" });
    } catch {
      return null;
    }
    if (pdf.size > MAX_HISTORY_PDF_BYTES || !startsWith(await readHead(pdf, 4), PDF_SIGNATURE)) {
      return null;
    }
    const snapshotBytes = snapshotHtml === null ? 0 : encoder.encode(snapshotHtml).byteLength;
    if (snapshotBytes > MAX_SNAPSHOT_BYTES) return null;

    items.push({
      entry: {
        ...entry,
        sizes: {
          pdf: pdf.size,
          snapshot: snapshotBytes,
          adText: encoder.encode(adText).byteLength,
        },
      },
      files: { pdf, snapshot: snapshotHtml, adText },
    });
  }
  return items;
}
