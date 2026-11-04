import { CV_PROFILE_SCHEMA_VERSION } from "@cv-snap/shared";
import { describe, expect, it } from "vitest";
import { smallProfile } from "../../../test/cv-fixtures";
import { historyEntry } from "../../../test/history-fixtures";
import { JPEG_HEAD } from "../../../test/panel-fixtures";
import {
  HISTORY_SCHEMA_VERSION,
  MAX_HISTORY_PDF_BYTES,
  type HistoryEntry,
  type HistoryFiles,
} from "@/features/history/history-entry";
import { MAX_SNAPSHOT_BYTES } from "@/features/job-ad/snapshot";
import {
  backupFileName,
  buildBackup,
  buildBackupFile,
  estimateBackupBytes,
  MAX_BACKUP_BYTES,
  parseBackup,
  type BackupHistorySource,
  type BackupProblem,
} from "./backup";

const photo = () => new Blob([new Uint8Array([...JPEG_HEAD, 1, 2, 3])], { type: "image/jpeg" });
const fileOf = (value: unknown) => new Blob([JSON.stringify(value)], { type: "application/json" });
const NOW = new Date(2026, 9, 29, 12, 0, 0);

/** Claims a size over the limit without allocating it; reading it would fail the test. */
function oversized(): Blob {
  const file = new Blob(["{}"]);
  Object.defineProperty(file, "size", { value: MAX_BACKUP_BYTES + 1 });
  Object.defineProperty(file, "text", { value: () => Promise.reject(new Error("read")) });
  return file;
}

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
    expect(parsed).toEqual({
      ok: true,
      profile: { ...profile, photoRef: null },
      photo: null,
      history: [],
    });
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
    expect(backupFileName(NOW)).toBe("cv-snap-backup-2026-10-29.json");
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
    ["a file over 256 MB, without reading it", oversized(), "TOO_LARGE"],
  ])("rejects %s", async (_, file, expected) => {
    expect(await problemOf(file)).toBe(expected);
  });
});

/** A PDF with every byte value, so base64 and back must keep binary data exactly. */
const pdfBytes = (tag: number) =>
  new Uint8Array([0x25, 0x50, 0x44, 0x46, ...Array.from({ length: 256 }, (_, i) => i), tag]);

const SNAPSHOT = "<html><body>Ogłoszenie – Łódź</body></html>";

type BackupJson = { history: { entries: Record<string, unknown>[] } } & Record<string, unknown>;

/** Two entries: one with a snapshot and a sent date, one without a snapshot. */
function historySource(): BackupHistorySource & { stored: Map<string, HistoryFiles> } {
  const encoder = new TextEncoder();
  const stored = new Map<string, HistoryFiles>([
    ["ad-1", { pdf: new Blob([pdfBytes(1)]), snapshot: SNAPSHOT, adText: "Frontend, Łódź" }],
    ["ad-2", { pdf: new Blob([pdfBytes(2)]), snapshot: null, adText: "Backend" }],
  ]);
  const entries: HistoryEntry[] = [
    historyEntry({
      adKey: "ad-1",
      sentOn: "2026-11-02",
      snapshot: "saved",
      sizes: {
        pdf: 261,
        snapshot: encoder.encode(SNAPSHOT).byteLength,
        adText: encoder.encode("Frontend, Łódź").byteLength,
      },
    }),
    historyEntry({
      adKey: "ad-2",
      snapshot: "too-large",
      sizes: { pdf: 261, snapshot: 0, adText: 7 },
    }),
  ];
  return { stored, entries, files: (adKey) => Promise.resolve(stored.get(adKey) ?? null) };
}

const bytesOf = async (blob: Blob) => new Uint8Array(await blob.arrayBuffer());

async function backupJson(): Promise<BackupJson> {
  const file = await buildBackupFile(smallProfile(), null, historySource(), NOW);
  return JSON.parse(await file.text()) as BackupJson;
}

/** A backup file with history whose entry at `index` is changed by `edit`. */
async function withEditedEntry(
  edit: (item: Record<string, unknown>) => void,
  index = 0,
): Promise<Blob> {
  const backup = await backupJson();
  const item = backup.history.entries[index];
  if (!item) throw new Error("no entry");
  edit(item);
  return fileOf(backup);
}

describe("backup with history", () => {
  it("restores every entry with identical files and metadata", async () => {
    const source = historySource();

    const parsed = await parseBackup(await buildBackupFile(smallProfile(), null, source, NOW));

    if (!parsed.ok) throw new Error(parsed.problem);
    expect(parsed.history.map((item) => item.entry)).toEqual(source.entries);
    for (const { entry, files } of parsed.history) {
      const original = source.stored.get(entry.adKey);
      if (!original) throw new Error("unexpected entry");
      expect(await bytesOf(files.pdf)).toEqual(await bytesOf(original.pdf));
      expect(files.snapshot).toBe(original.snapshot);
      expect(files.adText).toBe(original.adText);
    }
  });

  it("marks the history with its own schema version", async () => {
    expect(await backupJson()).toMatchObject({
      format: "cv-snap-profile",
      schemaVersion: CV_PROFILE_SCHEMA_VERSION,
      history: { schemaVersion: HISTORY_SCHEMA_VERSION },
    });
  });

  it("without history, writes the 0.1.x file exactly", async () => {
    const profile = smallProfile();

    const file = await buildBackupFile(profile, null, null, NOW);

    expect(await file.text()).toBe(JSON.stringify(await buildBackup(profile, null, NOW), null, 2));
    expect(await parseBackup(file)).toMatchObject({ ok: true, history: [] });
  });

  it("stays valid when the history is empty", async () => {
    const empty: BackupHistorySource = { entries: [], files: () => Promise.resolve(null) };

    const file = await buildBackupFile(smallProfile(), null, empty, NOW);

    expect(await parseBackup(file)).toMatchObject({ ok: true, history: [] });
  });

  it("leaves out an entry whose files are gone", async () => {
    const source = historySource();
    source.stored.delete("ad-1");

    const parsed = await parseBackup(await buildBackupFile(smallProfile(), null, source, NOW));

    expect(parsed.ok && parsed.history.map((item) => item.entry.adKey)).toEqual(["ad-2"]);
  });

  it("recalculates sizes from the files instead of trusting the file", async () => {
    const file = await withEditedEntry((item) => {
      (item.entry as HistoryEntry).sizes = { pdf: 1, snapshot: 999_999, adText: 0 };
    });

    const parsed = await parseBackup(file);

    expect(parsed.ok && parsed.history[0]?.entry.sizes).toEqual(historySource().entries[0]?.sizes);
  });

  it("estimates the file size from the entry sizes, with base64 for the PDFs", () => {
    const entry = historyEntry({ sizes: { pdf: 3000, snapshot: 500, adText: 100 } });

    expect(estimateBackupBytes([])).toBe(0);
    expect(estimateBackupBytes([entry, entry])).toBe(2 * (4000 + 500 + 100 + 1024));
  });

  it("refuses a newer history version before looking at the entries", async () => {
    const backup = await backupJson();

    const problem = await problemOf(
      fileOf({ ...backup, history: { schemaVersion: HISTORY_SCHEMA_VERSION + 1, entries: [{}] } }),
    );

    expect(problem).toBe("NEWER_VERSION");
  });

  it.each<[string, (item: Record<string, unknown>) => void, number?]>([
    ["damaged metadata", (item) => void ((item.entry as Record<string, unknown>).adKey = "")],
    ["a PDF that isn't a PDF", (item) => void (item.pdfBase64 = btoa("GIF89a fake"))],
    ["a PDF that isn't base64", (item) => void (item.pdfBase64 = "@@not base64@@")],
    [
      "a missing PDF",
      (item) => {
        delete item.pdfBase64;
      },
    ],
    [
      "a PDF over 10 MB",
      (item) => void (item.pdfBase64 = "A".repeat(Math.ceil(MAX_HISTORY_PDF_BYTES / 3) * 4 + 4)),
    ],
    [
      "a snapshot over 5 MB",
      (item) => void (item.snapshotHtml = "x".repeat(MAX_SNAPSHOT_BYTES + 1)),
    ],
    ["a saved snapshot that is missing", (item) => void (item.snapshotHtml = null)],
    ["a snapshot on an entry without one", (item) => void (item.snapshotHtml = "<p></p>"), 1],
  ])("rejects a history with %s, as a whole", async (_, edit, index) => {
    expect(await problemOf(await withEditedEntry(edit, index))).toBe("BAD_HISTORY");
  });

  it.each<[string, unknown]>([
    ["isn't an object", "entries"],
    ["has no entry list", { schemaVersion: HISTORY_SCHEMA_VERSION }],
  ])("rejects a history part that %s", async (_, history) => {
    const backup = await buildBackup(smallProfile(), null, NOW);

    expect(await problemOf(fileOf({ ...backup, history }))).toBe("BAD_HISTORY");
  });

  it("rejects the same ad twice", async () => {
    const backup = await backupJson();
    backup.history.entries.push({ ...backup.history.entries[0] });

    expect(await problemOf(fileOf(backup))).toBe("BAD_HISTORY");
  });
});
