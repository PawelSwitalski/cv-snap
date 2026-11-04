import "fake-indexeddb/auto";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { smallProfile } from "../../../test/cv-fixtures";
import { historyEntry } from "../../../test/history-fixtures";
import type { HistoryEntry } from "@/features/history/history-entry";
import { createMemoryHistoryRepository } from "@/features/history/history-repository";
import { createHistoryStore } from "@/features/history/store";
import { buildBackup, buildBackupFile } from "@/features/profile/backup";
import { ChromeStorageProfileRepository } from "@/features/profile/profile-repository";
import { createProfileStore } from "@/features/profile/store";
import { I18nProvider } from "@/lib/i18n/i18n";
import { formatMessage, type MessageKey } from "@/lib/i18n/messages";
import { createMemoryFileStore } from "@/lib/storage/file-store";
import { createMemoryStore, STORAGE_KEYS } from "@/lib/storage/local-store";
import { BackupSection } from "./BackupSection";
import { createSettingsStore } from "./store";

const en = (key: MessageKey, ...subs: string[]) => formatMessage("en", key, subs);
const NOW = new Date("2026-11-04T12:00:00.000Z");
const MB = 1024 * 1024;
const RECENT = "2026-11-01T10:00:00.000Z";
const OLD = "2025-01-01T10:00:00.000Z";

const filesOf = (text: string) => ({
  pdf: new Blob([`%PDF ${text}`]),
  snapshot: `<p>${text}</p>`,
  adText: text,
});

async function setup(local: HistoryEntry[] = [historyEntry({ adKey: "local" })]) {
  const memory = createMemoryStore({ [STORAGE_KEYS.activeProfile]: smallProfile() });
  const settings = createSettingsStore(memory);
  await settings.getState().load();
  const profiles = createProfileStore({
    repository: new ChromeStorageProfileRepository(memory),
    files: createMemoryFileStore(),
  });
  await profiles.getState().load();
  const repository = createMemoryHistoryRepository();
  for (const entry of local) await repository.put(entry, filesOf(entry.adKey));
  const history = createHistoryStore(repository);
  const download = vi.fn<(file: Blob, fileName: string) => void>();
  render(
    <I18nProvider store={memory} browserLanguage="en-US">
      <BackupSection
        deps={{
          profiles,
          isGenerating: () => false,
          subscribeGenerating: () => () => undefined,
          download,
          history: { store: history, settings, now: () => NOW },
        }}
      />
    </I18nProvider>,
  );
  // The section loads the history itself.
  await waitFor(() => {
    expect(history.getState().status).toBe("ready");
  });
  return { settings, profiles, repository, history, download, user: userEvent.setup() };
}

const exportButton = () => screen.getByRole("button", { name: en("backup_export") });

async function exported(download: ReturnType<typeof vi.fn>, call = 0) {
  await waitFor(() => {
    expect(download).toHaveBeenCalledTimes(call + 1);
  });
  const [file] = (download.mock.calls[call] ?? []) as [Blob?];
  return JSON.parse((await file?.text()) ?? "{}") as Record<string, unknown>;
}

/** A backup whose history has the given entries, from another computer. */
async function backupWith(entries: HistoryEntry[]): Promise<File> {
  const imported = { ...smallProfile(), id: "prof_imported" };
  const file = await buildBackupFile(imported, null, {
    entries,
    files: (adKey) => Promise.resolve(filesOf(`backup ${adKey}`)),
  });
  return new File([await file.text()], "cv-snap-backup.json", { type: "application/json" });
}

describe("BackupSection with history", () => {
  it("exports the history by default, and the profile only when unticked", async () => {
    const ctx = await setup();

    await ctx.user.click(exportButton());
    const withHistory = await exported(ctx.download);
    expect(withHistory).toMatchObject({ history: { entries: [{ entry: { adKey: "local" } }] } });
    expect(ctx.download.mock.calls[0]?.[1]).toMatch(/^cv-snap-backup-\d{4}-\d{2}-\d{2}\.json$/);

    await ctx.user.click(screen.getByLabelText(en("backup_include_history")));
    await ctx.user.click(exportButton());
    expect(await exported(ctx.download, 1)).not.toHaveProperty("history");
  });

  it("can't include an empty history", async () => {
    const ctx = await setup([]);

    expect(screen.getByLabelText<HTMLInputElement>(en("backup_include_history")).disabled).toBe(
      true,
    );
    await ctx.user.click(exportButton());
    expect(await exported(ctx.download)).not.toHaveProperty("history");
  });

  it("shows the size and asks before exporting more than 50 MB", async () => {
    const big = (adKey: string) =>
      historyEntry({ adKey, sizes: { pdf: 20 * MB, snapshot: 0, adText: 0 } });
    const ctx = await setup([big("a"), big("b")]);

    await ctx.user.click(exportButton());
    const dialog = await screen.findByRole("alertdialog");
    // 2 × 20 MB of PDFs as base64.
    expect(dialog.textContent).toContain(en("backup_large_description", "53"));
    await ctx.user.click(within(dialog).getByRole("button", { name: en("backup_large_cancel") }));
    expect(ctx.download).not.toHaveBeenCalled();

    await ctx.user.click(exportButton());
    await ctx.user.click(
      within(await screen.findByRole("alertdialog")).getByRole("button", {
        name: en("backup_large_export"),
      }),
    );
    await exported(ctx.download);
  });

  it("doesn't ask for a large history when it isn't included", async () => {
    const ctx = await setup([historyEntry({ sizes: { pdf: 60 * MB, snapshot: 0, adText: 0 } })]);

    await ctx.user.click(screen.getByLabelText(en("backup_include_history")));
    await ctx.user.click(exportButton());

    await exported(ctx.download);
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });

  it("says how many entries change, then merges them, imports the profile and applies retention", async () => {
    const ctx = await setup([
      historyEntry({ adKey: "local", lastDownloadedAt: RECENT, createdAt: RECENT }),
      historyEntry({ adKey: "shared", lastDownloadedAt: RECENT, createdAt: RECENT }),
    ]);
    ctx.settings.getState().setHistoryRetention({ mode: "months", months: 12 });
    const file = await backupWith([
      historyEntry({ adKey: "from-backup", lastDownloadedAt: RECENT, createdAt: RECENT }),
      historyEntry({ adKey: "shared", lastDownloadedAt: RECENT, createdAt: RECENT }),
      historyEntry({ adKey: "expired", lastDownloadedAt: OLD, createdAt: OLD }),
    ]);

    await ctx.user.upload(screen.getByLabelText(en("backup_import")), file);
    const dialog = await screen.findByRole("alertdialog");
    expect(dialog.textContent).toContain(en("backup_confirm_history", "2"));
    await ctx.user.click(
      within(dialog).getByRole("button", { name: en("backup_confirm_replace") }),
    );

    expect(await screen.findByRole("status")).toHaveProperty(
      "textContent",
      en("backup_imported_with_history", "2"),
    );
    expect(ctx.profiles.getState().active?.id).toBe("prof_imported");
    // The expired entry was imported, then removed by the 12-month retention.
    expect(ctx.history.getState().entries.map((e) => e.adKey)).toEqual([
      "from-backup",
      "local",
      "shared",
    ]);
    await expect(ctx.repository.getAdText("from-backup")).resolves.toBe("backup from-backup");
    await expect(ctx.repository.getAdText("shared")).resolves.toBe("shared");
  });

  it("imports a 0.1.x profile backup without touching the history", async () => {
    const ctx = await setup([historyEntry({ adKey: "old-local", lastDownloadedAt: OLD })]);
    ctx.settings.getState().setHistoryRetention({ mode: "months", months: 1 });
    const legacy = await buildBackup({ ...smallProfile(), id: "prof_legacy" }, null);

    await ctx.user.upload(
      screen.getByLabelText(en("backup_import")),
      new File([JSON.stringify(legacy, null, 2)], "cv-snap-profile-2026-10-29.json"),
    );
    const dialog = await screen.findByRole("alertdialog");
    expect(dialog.textContent).not.toContain(en("backup_confirm_history", "0"));
    await ctx.user.click(
      within(dialog).getByRole("button", { name: en("backup_confirm_replace") }),
    );

    expect(await screen.findByText(en("backup_imported"))).toBeTruthy();
    expect(ctx.profiles.getState().active?.id).toBe("prof_legacy");
    expect(ctx.history.getState().entries.map((e) => e.adKey)).toEqual(["old-local"]);
  });

  it("refuses a damaged history and writes nothing", async () => {
    const ctx = await setup();
    const file = await backupWith([historyEntry({ adKey: "from-backup" })]);
    const damaged = JSON.parse(await file.text()) as {
      history: { entries: { pdfBase64: string }[] };
    };
    const [first] = damaged.history.entries;
    if (first) first.pdfBase64 = btoa("not a pdf");

    await ctx.user.upload(
      screen.getByLabelText(en("backup_import")),
      new File([JSON.stringify(damaged)], "damaged.json"),
    );

    expect((await screen.findByRole("alert")).textContent).toBe(en("backup_error_bad_history"));
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(ctx.profiles.getState().active?.id).toBe(smallProfile().id);
    expect(ctx.history.getState().entries.map((e) => e.adKey)).toEqual(["local"]);
  });
});
