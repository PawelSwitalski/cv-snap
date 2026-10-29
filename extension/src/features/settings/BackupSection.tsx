import type { CvProfile } from "@cv-snap/shared";
import { Download, Upload } from "lucide-react";
import { useId, useRef, useState, useSyncExternalStore } from "react";
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
import {
  backupFileName,
  buildBackup,
  parseBackup,
  type BackupProblem,
} from "@/features/profile/backup";
import type { ProfileStore } from "@/features/profile/store";
import { useT } from "@/lib/i18n/i18n";
import type { MessageKey } from "@/lib/i18n/messages";
import { logger } from "@/lib/logger";
import { SettingsSection } from "./SettingsSection";

const PROBLEM_MESSAGES: Record<BackupProblem, MessageKey> = {
  TOO_LARGE: "backup_error_too_large",
  NOT_JSON: "backup_error_not_a_backup",
  NOT_A_BACKUP: "backup_error_not_a_backup",
  NEWER_VERSION: "backup_error_newer_version",
  INVALID: "backup_error_invalid",
  BAD_PHOTO: "backup_error_bad_photo",
};

export interface BackupSectionDeps {
  profiles: ProfileStore;
  /** True while a generation runs: importing would change the facts under it (story 009). */
  isGenerating: () => boolean;
  subscribeGenerating: (listener: () => void) => () => void;
  download: (file: Blob, fileName: string) => void;
}

type Status =
  | { kind: "idle" }
  | { kind: "message"; key: MessageKey; isError: boolean }
  | { kind: "confirm"; profile: CvProfile; photo: Blob | null };

/**
 * Profile backup (story 009): export the confirmed profile to a JSON file (photo only if chosen),
 * import one after a confirmation. Invalid, foreign and newer-version files are refused with a
 * message; import waits while a generation runs.
 */
export function BackupSection({ deps }: { deps: BackupSectionDeps }) {
  const t = useT();
  const active = useStore(deps.profiles, (state) => state.active);
  const hasDraft = useStore(deps.profiles, (state) => state.draft !== null);
  const hasPhoto = useStore(deps.profiles, (state) => state.hasPhoto);
  const isGenerating = useGenerating(deps);
  const [withPhoto, setWithPhoto] = useState(false);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const fileInput = useRef<HTMLInputElement>(null);
  const photoId = useId();
  const inputId = useId();
  const noteId = useId();

  const exportProfile = async () => {
    if (!active) return;
    try {
      const photo = withPhoto ? ((await deps.profiles.getState().photo()) ?? null) : null;
      const backup = await buildBackup(active, photo);
      deps.download(
        new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" }),
        backupFileName(),
      );
      setStatus({ kind: "message", key: "backup_exported", isError: false });
    } catch (error) {
      logger.error("profile export failed", error instanceof Error ? error.name : "unknown");
      setStatus({ kind: "message", key: "backup_error_export", isError: true });
    }
  };

  const chooseFile = async (file: File | undefined) => {
    if (!file) return;
    const parsed = await parseBackup(file);
    if (!parsed.ok) {
      setStatus({ kind: "message", key: PROBLEM_MESSAGES[parsed.problem], isError: true });
      return;
    }
    setStatus({ kind: "confirm", profile: parsed.profile, photo: parsed.photo });
  };

  const importProfile = async (profile: CvProfile, photo: Blob | null) => {
    if (deps.isGenerating()) {
      setStatus({ kind: "message", key: "backup_blocked_generating", isError: true });
      return;
    }
    try {
      await deps.profiles.getState().importProfile(profile, photo);
      setStatus({ kind: "message", key: "backup_imported", isError: false });
    } catch (error) {
      logger.error("profile import failed", error instanceof Error ? error.name : "unknown");
      setStatus({ kind: "message", key: "backup_error_import", isError: true });
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
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={!active}
          onClick={() => {
            void exportProfile();
          }}
        >
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
          {t(status.key)}
        </p>
      ) : null}

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
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("backup_confirm_keep")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (status.kind === "confirm") void importProfile(status.profile, status.photo);
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
