import { CV_PROFILE_SCHEMA_VERSION } from "@cv-snap/shared";
import { describe, expect, it } from "vitest";
import { smallProfile } from "../../../test/cv-fixtures";
import { JPEG_HEAD } from "../../../test/panel-fixtures";
import {
  backupFileName,
  buildBackup,
  MAX_BACKUP_BYTES,
  parseBackup,
  type BackupProblem,
} from "./backup";

const photo = () => new Blob([new Uint8Array([...JPEG_HEAD, 1, 2, 3])], { type: "image/jpeg" });
const fileOf = (value: unknown) => new Blob([JSON.stringify(value)], { type: "application/json" });
const NOW = new Date(2026, 9, 29, 12, 0, 0);

async function problemOf(file: Blob): Promise<BackupProblem | null> {
  const parsed = await parseBackup(file);
  return parsed.ok ? null : parsed.problem;
}

describe("profile backup", () => {
  it("round-trips a profile without a photo, and marks the format and schema version", async () => {
    const profile = { ...smallProfile(), photoRef: "photo" };

    const backup = await buildBackup(profile, null, NOW);
    const parsed = await parseBackup(fileOf(backup));

    expect(backup).toMatchObject({
      format: "cv-snap-profile",
      schemaVersion: CV_PROFILE_SCHEMA_VERSION,
      exportedAt: NOW.toISOString(),
    });
    expect(backup.photo).toBeUndefined();
    // Without the photo, the backup doesn't claim one.
    expect(backup.profile.photoRef).toBeNull();
    expect(parsed).toEqual({ ok: true, profile: { ...profile, photoRef: null }, photo: null });
  });

  it("embeds the photo as base64 only when given, and restores the same bytes", async () => {
    const backup = await buildBackup({ ...smallProfile(), photoRef: "photo" }, photo(), NOW);
    const parsed = await parseBackup(fileOf(backup));

    expect(backup.photo?.type).toBe("image/jpeg");
    if (!parsed.ok || !parsed.photo) throw new Error("expected a photo");
    expect(new Uint8Array(await parsed.photo.arrayBuffer())).toEqual(
      new Uint8Array(await photo().arrayBuffer()),
    );
  });

  it("names the file after the export date", () => {
    expect(backupFileName(NOW)).toBe("cv-snap-profile-2026-10-29.json");
  });

  it("refuses a newer version before looking at the profile", async () => {
    const backup = await buildBackup(smallProfile(), null, NOW);

    const problem = await problemOf(
      fileOf({
        ...backup,
        schemaVersion: CV_PROFILE_SCHEMA_VERSION + 1,
        profile: { new: "shape" },
      }),
    );

    expect(problem).toBe("NEWER_VERSION");
  });

  it.each<[string, Blob, BackupProblem]>([
    ["not JSON", new Blob(["{ not json"]), "NOT_JSON"],
    ["JSON that isn't a backup", fileOf({ name: "Jan" }), "NOT_A_BACKUP"],
    ["a bare profile without the envelope", fileOf(smallProfile()), "NOT_A_BACKUP"],
    [
      "a damaged profile",
      fileOf({ format: "cv-snap-profile", schemaVersion: 1, profile: { contact: {} } }),
      "INVALID",
    ],
    [
      "an unconfirmed profile",
      fileOf({
        format: "cv-snap-profile",
        schemaVersion: 1,
        profile: { ...smallProfile(), confirmedAt: null },
      }),
      "INVALID",
    ],
    [
      "a photo that isn't a JPG or PNG",
      fileOf({
        format: "cv-snap-profile",
        schemaVersion: 1,
        profile: smallProfile(),
        photo: { type: "image/png", base64: btoa("GIF89a fake") },
      }),
      "BAD_PHOTO",
    ],
    [
      "a photo that isn't base64",
      fileOf({
        format: "cv-snap-profile",
        schemaVersion: 1,
        profile: smallProfile(),
        photo: { type: "image/jpeg", base64: "@@not base64@@" },
      }),
      "BAD_PHOTO",
    ],
    ["a file over 5 MB", new Blob([new Uint8Array(MAX_BACKUP_BYTES + 1)]), "TOO_LARGE"],
  ])("rejects %s", async (_, file, expected) => {
    expect(await problemOf(file)).toBe(expected);
  });
});
