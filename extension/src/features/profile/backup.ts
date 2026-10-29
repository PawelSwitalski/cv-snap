import { CV_PROFILE_SCHEMA_VERSION, CvProfileSchema, type CvProfile } from "@cv-snap/shared";
import { z } from "zod";
import { blobToBase64 } from "@/lib/file-checks";
import { validatePhoto } from "./photo";

/**
 * Profile backup file (story 009): the confirmed profile as JSON, with the photo embedded as base64
 * only when the user chooses. `schemaVersion` is the profile schema version, so a file from a
 * newer cv-snap is recognised and refused instead of being half-read.
 */
export const BACKUP_FORMAT = "cv-snap-profile";

/** A backup is a small JSON file; a 2 MB photo grows to ~2.7 MB as base64. */
export const MAX_BACKUP_BYTES = 5 * 1024 * 1024;

const PHOTO_TYPES = ["image/jpeg", "image/png"] as const;

export interface ProfileBackup {
  format: typeof BACKUP_FORMAT;
  schemaVersion: number;
  exportedAt: string;
  profile: CvProfile;
  photo?: { type: (typeof PHOTO_TYPES)[number]; base64: string };
}

export type BackupProblem =
  "TOO_LARGE" | "NOT_JSON" | "NOT_A_BACKUP" | "NEWER_VERSION" | "INVALID" | "BAD_PHOTO";

export type ParsedBackup =
  { ok: true; profile: CvProfile; photo: Blob | null } | { ok: false; problem: BackupProblem };

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

/** `cv-snap-profile-2026-10-29.json` (local date). */
export function backupFileName(now: Date = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `cv-snap-profile-${String(now.getFullYear())}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.json`;
}

const EnvelopeSchema = z.object({
  format: z.literal(BACKUP_FORMAT),
  schemaVersion: z.number().int().positive(),
  profile: z.unknown(),
  photo: z
    .object({ type: z.enum(PHOTO_TYPES), base64: z.string().max(MAX_BACKUP_BYTES) })
    .optional(),
});

/**
 * Reads a backup file. The file comes from outside the extension: everything is validated (the
 * profile with the strict `CvProfileSchema`, the photo by its signature and size, FR-5).
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
  const { schemaVersion, profile: rawProfile, photo: rawPhoto } = envelope.data;
  if (schemaVersion > CV_PROFILE_SCHEMA_VERSION) return { ok: false, problem: "NEWER_VERSION" };

  const profile = CvProfileSchema.safeParse(rawProfile);
  if (!profile.success || profile.data.confirmedAt === null) {
    return { ok: false, problem: "INVALID" };
  }

  let photo: Blob | null = null;
  if (rawPhoto) {
    try {
      const binary = atob(rawPhoto.base64);
      const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
      photo = new Blob([bytes], { type: rawPhoto.type });
    } catch {
      return { ok: false, problem: "BAD_PHOTO" };
    }
    if ((await validatePhoto(photo)) !== null) return { ok: false, problem: "BAD_PHOTO" };
  }
  return { ok: true, profile: profile.data, photo };
}
