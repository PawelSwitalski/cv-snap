import { FileUp } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { storeCvFile } from "@/features/cv-upload/StoreCvOnly";
import { storedCvName } from "@/features/history/record-own-cv";
import { useT } from "@/lib/i18n/i18n";
import type { MessageKey } from "@/lib/i18n/messages";
import { FILE_KEYS, type FileStore } from "@/lib/storage/file-store";
import { SettingsSection } from "./SettingsSection";

export interface YourCvSectionDeps {
  files: FileStore;
}

/**
 * "Your CV" in history-only mode (story 003-replace-stored-cv): the stored CV's name and Replace….
 * Entries already in History keep their own copies.
 */
export function YourCvSection({ deps }: { deps: YourCvSectionDeps }) {
  const t = useT();
  const inputId = useId();
  const fileInput = useRef<HTMLInputElement>(null);
  const [name, setName] = useState<string | null>(null);
  const [status, setStatus] = useState<{ key: MessageKey; isError: boolean } | null>(null);

  const { files } = deps;
  const reload = useCallback(
    () =>
      files.get(FILE_KEYS.cvOriginal).then(
        (file) => {
          setName(file ? storedCvName(file) : null);
        },
        () => undefined,
      ),
    [files],
  );
  useEffect(() => {
    void reload();
  }, [reload]);

  const replace = async (file: File | undefined) => {
    if (!file) return;
    const problem = await storeCvFile(files, file);
    setStatus(
      problem ? { key: problem, isError: true } : { key: "your_cv_replaced", isError: false },
    );
    await reload();
  };

  return (
    <SettingsSection heading="your_cv_title">
      <p className="text-sm">{name ? t("your_cv_stored", name) : t("your_cv_none")}</p>
      <p className="text-xs text-muted-foreground">{t("your_cv_note")}</p>
      <Button
        variant="outline"
        size="sm"
        className="self-start"
        onClick={() => fileInput.current?.click()}
      >
        <FileUp aria-hidden="true" />
        {t("your_cv_replace")}
      </Button>
      <label htmlFor={inputId} className="sr-only">
        {t("your_cv_replace")}
      </label>
      <input
        ref={fileInput}
        id={inputId}
        type="file"
        accept="application/pdf,.pdf"
        className="sr-only"
        tabIndex={-1}
        onChange={(event) => {
          const [file] = event.currentTarget.files ?? [];
          event.currentTarget.value = "";
          void replace(file);
        }}
      />
      {status ? (
        <p role={status.isError ? "alert" : "status"} className="text-xs">
          {t(status.key)}
        </p>
      ) : null}
    </SettingsSection>
  );
}
