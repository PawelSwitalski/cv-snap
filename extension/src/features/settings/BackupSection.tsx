import type { CvProfile } from "@cv-snap/shared";
import { Download, Upload } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { useStore } from "zustand";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox, Label } from "@/components/ui/field";
import type { HistoryEntry, HistoryEntryWithFiles } from "@/features/history/history-entry";
import { countChanges } from "@/features/history/merge-import";
import type { HistoryStore } from "@/features/history/store";
import {
  backupFileName,
  buildBackupFile,
  estimateBackupBytes,
  parseBackup,
  type BackupProblem,
} from "@/features/profile/backup";
import type { ProfileStore } from "@/features/profile/store";
import { megabytes } from "@/lib/format-size";
import { useLanguage, useT } from "@/lib/i18n/i18n";
import type { MessageKey } from "@/lib/i18n/messages";
import { logger } from "@/lib/logger";
import { SettingsSection } from "./SettingsSection";
import type { SettingsStore } from "./store";

const PROBLEM_MESSAGES: Record<BackupProblem, MessageKey> = {
  TOO_LARGE: "backup_error_too_large",
  NOT_JSON: "backup_error_not_a_backup",
  NOT_A_BACKUP: "backup_error_not_a_backup",
  NEWER_VERSION: "backup_error_newer_version",
  INVALID: "backup_error_invalid",
  BAD_PHOTO: "backup_error_bad_photo",
  BAD_HISTORY: "backup_error_bad_history",
};

/** Above this estimate, the export shows the size and asks first (story 001-export-with-history). */
export const LARGE_BACKUP_BYTES = 50 * 1024 * 1024;

export interface BackupSectionDeps {
  profiles: ProfileStore;
  /** True while a generation runs: importing would change the facts under it (story 009). */
  isGenerating: () => boolean;
  subscribeGenerating: (listener: () => void) => () => void;
  download: (file: Blob, fileName: string) => void;
  /** History in the backup (bolt 026); absent without a history. */
  history?: { store: HistoryStore; settings: SettingsStore; now?: () => Date };
}

type Status =
  | { kind: "idle" }
  | { kind: "message"; key: MessageKey; args?: string[]; isError: boolean }
  | { kind: "confirm-export"; bytes: number }
  | {
      kind: "confirm";
      profile: CvProfile;
      photo: Blob | null;
      history: HistoryEntryWithFiles[];
      changes: number;
    };

const NO_ENTRIES: readonly HistoryEntry[] = [];

/**
 * Backup (story 009, bolt 026): export the confirmed profile to a JSON file (photo and history
 * only if chosen), import one after a confirmation. Invalid, foreign and newer-version files are
 * refused with a message before anything is written; import waits while a generation runs. The
 * imported history is merged into the local one, then the profile replaced, then retention
 * applied.
 */
export function BackupSection({ deps }: { deps: BackupSectionDeps }) {
  const t = useT();
  const { language } = useLanguage();
  const active = useStore(deps.profiles, (state) => state.active);
  const hasDraft = useStore(deps.profiles, (state) => state.draft !== null);
  const hasPhoto = useStore(deps.profiles, (state) => state.hasPhoto);
  const isGenerating = useGenerating(deps);
  const historyStore = deps.history?.store;
  const entries = useHistoryEntries(historyStore);
  const [withPhoto, setWithPhoto] = useState(false);
  const [withHistory, setWithHistory] = useState(true);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const fileInput = useRef<HTMLInputElement>(null);
  const photoId = useId();
  const historyId = useId();
  const inputId = useId();
  const noteId = useId();
  const includesHistory = withHistory && entries.length > 0;

  useEffect(() => {
    if (historyStore?.getState().status === "idle") void historyStore.getState().load();
  }, [historyStore]);

  const exportBackup = async () => {
    if (!active) return;
    try {
      const photo = withPhoto ? ((await deps.profiles.getState().photo()) ?? null) : null;
      const history =
        includesHistory && historyStore
          ? {
              entries: historyStore.getState().entries,
              files: (adKey: string) => historyStore.getState().readFiles(adKey),
            }
          : null;
      deps.download(await buildBackupFile(active, photo, history), backupFileName());
      setStatus({ kind: "message", key: "backup_exported", isError: false });
    } catch (error) {
      logger.error("backup export failed", error instanceof Error ? error.name : "unknown");
      setStatus({ kind: "message", key: "backup_error_export", isError: true });
    }
  };

  const requestExport = () => {
    const bytes = includesHistory ? estimateBackupBytes(entries) : 0;
    if (bytes > LARGE_BACKUP_BYTES) setStatus({ kind: "confirm-export", bytes });
    else void exportBackup();
  };

  const chooseFile = async (file: File | undefined) => {
    if (!file) return;
    const parsed = await parseBackup(file);
    if (!parsed.ok) {
      setStatus({ kind: "message", key: PROBLEM_MESSAGES[parsed.problem], isError: true });
      return;
    }
    const history = historyStore ? parsed.history : [];
    if (history.length > 0 && historyStore?.getState().status !== "ready") {
      await historyStore?.getState().load();
    }
    const changes = historyStore
      ? countChanges(
          historyStore.getState().entries,
          history.map((item) => item.entry),
        )
      : 0;
    setStatus({ kind: "confirm", profile: parsed.profile, photo: parsed.photo, history, changes });
  };

  const importBackup = async (
    profile: CvProfile,
    photo: Blob | null,
    history: readonly HistoryEntryWithFiles[],
  ) => {
    if (deps.isGenerating()) {
      setStatus({ kind: "message", key: "backup_blocked_generating", isError: true });
      return;
    }
    let changed = 0;
    try {
      if (history.length > 0 && deps.history) {
        changed = await deps.history.store.getState().importEntries(history);
      }
      await deps.profiles.getState().importProfile(profile, photo);
    } catch (error) {
      logger.error("backup import failed", error instanceof Error ? error.name : "unknown");
      setStatus({ kind: "message", key: "backup_error_import", isError: true });
      return;
    }
    if (history.length > 0 && deps.history) {
      const { store, settings, now = () => new Date() } = deps.history;
      try {
        await store.getState().prune(settings.getState().historyRetention, now());
      } catch (error) {
        logger.warn("history not pruned", error instanceof Error ? error.name : "unknown");
      }
      setStatus({
        kind: "message",
        key: "backup_imported_with_history",
        args: [String(changed)],
        isError: false,
      });
    } else {
      setStatus({ kind: "message", key: "backup_imported", isError: false });
    }
  };

  return (
    <SettingsSection heading="settings_backup">
      <p className="text-xs text-muted-foreground">{t("settings_backup_note")}</p>
      <div className="flex items-center gap-2">
        <Checkbox
          id={photoId}
          checked={withPhoto}
          disabled={!hasPhoto}
          onChange={(event) => {
            setWithPhoto(event.currentTarget.checked);
          }}
        />
        <Label htmlFor={photoId}>{t("backup_include_photo")}</Label>
      </div>
      {historyStore ? (
        <div className="flex items-center gap-2">
          <Checkbox
            id={historyId}
            checked={includesHistory}
            disabled={entries.length === 0}
            onChange={(event) => {
              setWithHistory(event.currentTarget.checked);
            }}
          />
          <Label htmlFor={historyId}>{t("backup_include_history")}</Label>
        </div>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" disabled={!active} onClick={requestExport}>
          <Download aria-hidden="true" />
          {t("backup_export")}
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={isGenerating}
          aria-describedby={isGenerating ? noteId : undefined}
          onClick={() => fileInput.current?.click()}
        >
          <Upload aria-hidden="true" />
          {t("backup_import")}
        </Button>
        <label htmlFor={inputId} className="sr-only">
          {t("backup_import")}
        </label>
        <input
          ref={fileInput}
          id={inputId}
          type="file"
          accept="application/json,.json"
          className="sr-only"
          tabIndex={-1}
          onChange={(event) => {
            const [file] = event.currentTarget.files ?? [];
            event.currentTarget.value = "";
            void chooseFile(file);
          }}
        />
      </div>
      {!active ? <p className="text-xs text-muted-foreground">{t("backup_no_profile")}</p> : null}
      {isGenerating ? (
        <p id={noteId} className="text-xs text-muted-foreground">
          {t("backup_blocked_generating")}
        </p>
      ) : null}
      {status.kind === "message" ? (
        <p role={status.isError ? "alert" : "status"} className="text-xs">
          {t(status.key, ...(status.args ?? []))}
        </p>
      ) : null}

      <AlertDialog
        open={status.kind === "confirm-export"}
        onOpenChange={(isOpen) => {
          if (!isOpen && status.kind === "confirm-export") setStatus({ kind: "idle" });
        }}
      >
        <AlertDialogContent>
          <AlertDialogTitle>{t("backup_large_title")}</AlertDialogTitle>
          <AlertDialogDescription>
            {status.kind === "confirm-export"
              ? t("backup_large_description", megabytes(status.bytes, language))
              : null}
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("backup_large_cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                void exportBackup();
              }}
            >
              {t("backup_large_export")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={status.kind === "confirm"}
        onOpenChange={(isOpen) => {
          if (!isOpen && status.kind === "confirm") setStatus({ kind: "idle" });
        }}
      >
        <AlertDialogContent>
          <AlertDialogTitle>{t("backup_confirm_title")}</AlertDialogTitle>
          <AlertDialogDescription>
            {status.kind === "confirm"
              ? t("backup_confirm_description", status.profile.contact.fullName)
              : null}
            {hasDraft ? ` ${t("backup_confirm_draft")}` : null}
            {status.kind === "confirm" && status.changes > 0
              ? ` ${t("backup_confirm_history", String(status.changes))}`
              : null}
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("backup_confirm_keep")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (status.kind === "confirm") {
                  void importBackup(status.profile, status.photo, status.history);
                }
              }}
            >
              {t("backup_confirm_replace")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SettingsSection>
  );
}

/** Follows the generate store's running state (import is blocked during a run). */
function useGenerating(deps: Pick<BackupSectionDeps, "isGenerating" | "subscribeGenerating">) {
  return useSyncExternalStore(deps.subscribeGenerating, deps.isGenerating);
}

/** The history's entries, or none when the panel has no history. */
function useHistoryEntries(store: HistoryStore | undefined): readonly HistoryEntry[] {
  const subscribe = useCallback(
    (listener: () => void) => (store ? store.subscribe(listener) : () => undefined),
    [store],
  );
  return useSyncExternalStore(subscribe, () => (store ? store.getState().entries : NO_ENTRIES));
}
