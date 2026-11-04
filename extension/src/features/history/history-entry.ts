import { LanguageCodeSchema } from "@cv-snap/shared";
import { z } from "zod";

/**
 * One history entry (story 001-history-store): the last CV downloaded for one job ad, keyed by the
 * ad's `AdKey` (same identity as the requirements cache). Metadata only; the PDF, the page snapshot
 * and the ad text are stored as separate files so the list never loads them.
 */
export const HISTORY_SCHEMA_VERSION = 1;

/** A generated CV is far smaller; a larger PDF in a backup isn't one of ours (bolt 026). */
export const MAX_HISTORY_PDF_BYTES = 10 * 1024 * 1024;

/** Cleaned page snapshot (story 003): saved, dropped as larger than 5 MB, or not available. */
export const SNAPSHOT_STATUSES = ["saved", "too-large", "none"] as const;
export type SnapshotStatus = (typeof SNAPSHOT_STATUSES)[number];

/** `YYYY-MM-DD`: a calendar date in the user's time zone, not a timestamp (story 002, bolt 024). */
const CalendarDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const HistoryEntrySchema = z.object({
  schemaVersion: z.literal(HISTORY_SCHEMA_VERSION),
  adKey: z.string().min(1),
  /** Job title and company as parsed from the ad; empty or null when unknown. */
  title: z.string(),
  company: z.string().nullable(),
  /** The ad's page; null for an ad captured without an address. */
  url: z.string().nullable(),
  isManualSelection: z.boolean(),
  outputLanguage: LanguageCodeSchema,
  fileName: z.string().min(1),
  createdAt: z.iso.datetime(),
  lastDownloadedAt: z.iso.datetime(),
  sentOn: CalendarDateSchema.nullable(),
  snapshot: z.enum(SNAPSHOT_STATUSES),
  /** Byte sizes of the stored files ("space used" in settings, bolt 025). */
  sizes: z.object({
    pdf: z.number().int().nonnegative(),
    snapshot: z.number().int().nonnegative(),
    adText: z.number().int().nonnegative(),
  }),
});

export type HistoryEntry = z.infer<typeof HistoryEntrySchema>;

/** Files of an entry, stored next to its metadata. */
export const HISTORY_FILE_KINDS = ["pdf", "snapshot", "adText"] as const;
export type HistoryFileKind = (typeof HISTORY_FILE_KINDS)[number];

export interface HistoryFiles {
  pdf: Blob;
  /** Cleaned page HTML, or null when the entry has none. */
  snapshot: string | null;
  adText: string;
}

/** An entry with its files, as read from a backup file (bolt 026). */
export interface HistoryEntryWithFiles {
  entry: HistoryEntry;
  files: HistoryFiles;
}

/** The list (metadata only) plus how many stored records couldn't be read. */
export interface HistoryList {
  entries: HistoryEntry[];
  unreadable: number;
}
