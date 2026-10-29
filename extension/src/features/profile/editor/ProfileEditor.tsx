import type { CvProfileContent } from "@cv-snap/shared";
import { CheckCircle2, ImagePlus, Loader2, Sparkles, XCircle } from "lucide-react";
import { useEffect, useId, useState } from "react";
import { useStore } from "zustand";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/field";
import { useT } from "@/lib/i18n/i18n";
import type { MessageKey } from "@/lib/i18n/messages";
import type { PhotoProblem } from "../photo";
import type { ProfileStore } from "../store";
import { TextField } from "./fields";
import { ProfileSections } from "./sections";

const PHOTO_PROBLEMS: Record<PhotoProblem, MessageKey> = {
  NOT_IMAGE: "photo_error_type",
  TOO_LARGE: "photo_error_size",
};

/**
 * Profile review editor (story 004): every edit is saved at once; Confirm makes the draft the active
 * profile (asking first when it would replace a different active profile). Generate stays disabled
 * until a profile is confirmed.
 */
export default function ProfileEditor({ store }: { store: ProfileStore }) {
  const t = useT();
  const draft = useStore(store, (state) => state.draft);
  const active = useStore(store, (state) => state.active);
  const isEditingActive = useStore(store, (state) => state.isEditingActive);
  const saveState = useStore(store, (state) => state.saveState);
  const undoSnapshot = useStore(store, (state) => state.undoSnapshot);
  const edit = useStore(store, (state) => state.edit);
  const [showErrors, setShowErrors] = useState(false);
  const [invalidCount, setInvalidCount] = useState(0);
  const [isReplaceOpen, setIsReplaceOpen] = useState(false);

  if (!draft) return null;

  const confirm = async () => {
    const result = await store.getState().confirm();
    if (result.ok) return;
    setShowErrors(true);
    setInvalidCount(result.paths.length);
  };

  const onConfirmClick = () => {
    if (active && !isEditingActive) setIsReplaceOpen(true);
    else void confirm();
  };

  return (
    <div className="flex flex-col gap-3">
      <Card aria-labelledby="editor-title">
        <CardHeader>
          <CardTitle id="editor-title">
            {isEditingActive ? t("editor_title_edit") : t("editor_title_review")}
          </CardTitle>
          <p className="text-sm text-muted-foreground">{t("editor_intro")}</p>
        </CardHeader>
        <CardContent>
          <ContactFields draft={draft} edit={edit} showErrors={showErrors} />
          <PhotoField store={store} />
        </CardContent>
      </Card>

      <ProfileSections draft={draft} edit={edit} showErrors={showErrors} />

      {undoSnapshot ? (
        <Alert role="status">
          <AlertDescription className="flex items-center justify-between gap-2">
            {t("editor_deleted")}
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                store.getState().undoDeletion();
              }}
            >
              {t("editor_undo")}
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      {invalidCount > 0 ? (
        <Alert role="alert" variant="destructive">
          <AlertTitle>
            <XCircle aria-hidden="true" />
            {t("editor_invalid_title")}
          </AlertTitle>
          <AlertDescription>{t("editor_invalid", String(invalidCount))}</AlertDescription>
        </Alert>
      ) : null}

      <div className="sticky bottom-0 flex flex-col gap-2 border-t bg-background py-3">
        <p aria-live="polite" className="flex items-center gap-2 text-xs text-muted-foreground">
          {saveState === "saving" ? (
            <Loader2 aria-hidden="true" className="size-3 animate-spin" />
          ) : saveState === "saved" ? (
            <CheckCircle2 aria-hidden="true" className="size-3" />
          ) : (
            <XCircle aria-hidden="true" className="size-3" />
          )}
          {saveState === "saving"
            ? t("editor_saving")
            : saveState === "saved"
              ? t("editor_saved")
              : t("editor_save_failed")}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button onClick={onConfirmClick}>
            {isEditingActive ? t("editor_save_changes") : t("editor_confirm")}
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              void store.getState().discardDraft();
            }}
          >
            {isEditingActive ? t("editor_cancel_edit") : t("editor_discard")}
          </Button>
        </div>
        {active === null ? <GenerateDisabled /> : null}
      </div>

      <AlertDialog open={isReplaceOpen} onOpenChange={setIsReplaceOpen}>
        <AlertDialogContent>
          <AlertDialogTitle>{t("replace_title")}</AlertDialogTitle>
          <AlertDialogDescription>{t("replace_description")}</AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("replace_keep")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                void confirm();
              }}
            >
              {t("replace_confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/** Generate is unavailable until a profile is confirmed (story 004). */
export function GenerateDisabled() {
  const t = useT();
  const hintId = useId();
  return (
    <div className="flex flex-col gap-1">
      <Button variant="secondary" disabled aria-describedby={hintId}>
        <Sparkles aria-hidden="true" />
        {t("generate_button")}
      </Button>
      <p id={hintId} className="text-xs text-muted-foreground">
        {t("generate_confirm_first")}
      </p>
    </div>
  );
}

function ContactFields({
  draft,
  edit,
  showErrors,
}: {
  draft: CvProfileContent;
  edit: (change: (draft: CvProfileContent) => CvProfileContent) => void;
  showErrors: boolean;
}) {
  const setContact = (patch: Partial<CvProfileContent["contact"]>) => {
    edit((current) => ({ ...current, contact: { ...current.contact, ...patch } }));
  };
  return (
    <div className="flex flex-col gap-2">
      <TextField
        label="field_full_name"
        value={draft.contact.fullName}
        isRequired
        showErrors={showErrors}
        onChange={(value) => {
          setContact({ fullName: value ?? "" });
        }}
      />
      <TextField
        label="field_headline"
        value={draft.headline}
        isNullable
        onChange={(value) => {
          edit((current) => ({ ...current, headline: value }));
        }}
      />
      <TextField
        label="field_email"
        type="email"
        value={draft.contact.email}
        isNullable
        onChange={(value) => {
          setContact({ email: value });
        }}
      />
      <TextField
        label="field_phone"
        type="tel"
        value={draft.contact.phone}
        isNullable
        onChange={(value) => {
          setContact({ phone: value });
        }}
      />
      <TextField
        label="field_location"
        value={draft.contact.location}
        isNullable
        onChange={(value) => {
          setContact({ location: value });
        }}
      />
    </div>
  );
}

/** Optional photo: JPG/PNG ≤ 2 MB, kept in IndexedDB on this PC (FR-5). */
function PhotoField({ store }: { store: ProfileStore }) {
  const t = useT();
  const inputId = useId();
  const hasPhoto = useStore(store, (state) => state.hasPhoto);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [problem, setProblem] = useState<MessageKey | null>(null);

  useEffect(() => {
    if (!hasPhoto) {
      setPreviewUrl(null);
      return;
    }
    let url: string | null = null;
    let isCurrent = true;
    void store
      .getState()
      .photo()
      .then((blob) => {
        if (!blob || !isCurrent) return;
        url = URL.createObjectURL(blob);
        setPreviewUrl(url);
      });
    return () => {
      isCurrent = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [hasPhoto, store]);

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={inputId}>{t("photo_label")}</Label>
      <div className="flex items-center gap-3">
        {previewUrl ? (
          <img src={previewUrl} alt={t("photo_alt")} className="size-16 rounded-md object-cover" />
        ) : (
          <ImagePlus aria-hidden="true" className="size-8 text-muted-foreground" />
        )}
        <input
          id={inputId}
          type="file"
          accept="image/jpeg,image/png"
          className="max-w-full text-sm file:mr-2 file:rounded-md file:border file:border-input file:bg-background file:px-2 file:py-1"
          onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            event.currentTarget.value = "";
            if (!file) return;
            void store
              .getState()
              .setPhoto(file)
              .then((result) => {
                setProblem(result ? PHOTO_PROBLEMS[result] : null);
              });
          }}
        />
        {hasPhoto ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              void store.getState().removePhoto();
            }}
          >
            {t("photo_remove")}
          </Button>
        ) : null}
      </div>
      <p className="text-xs text-muted-foreground">{t("photo_limits")}</p>
      {problem ? (
        <p role="alert" className="text-sm text-destructive">
          {t(problem)}
        </p>
      ) : null}
    </div>
  );
}
