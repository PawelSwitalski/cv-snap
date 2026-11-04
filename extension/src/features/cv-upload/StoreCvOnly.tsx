import { FileUp, XCircle } from "lucide-react";
import { useId, useState, type DragEvent } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useT } from "@/lib/i18n/i18n";
import type { MessageKey } from "@/lib/i18n/messages";
import { logger } from "@/lib/logger";
import { FILE_KEYS, type FileStore } from "@/lib/storage/file-store";
import { validateCvFile, type CvFileProblem } from "./validate-file";

export const CV_FILE_PROBLEMS: Record<CvFileProblem, MessageKey> = {
  NOT_PDF: "upload_error_not_pdf",
  TOO_LARGE: "upload_error_too_large",
  EMPTY: "upload_error_empty",
};

/**
 * Checks a PDF like the CV upload and stores it as the original CV (`cv-original`), without the
 * helper or AI (intent 005). Returns the problem's message key, or null when stored.
 */
export async function storeCvFile(files: FileStore, file: File): Promise<MessageKey | null> {
  const problem = await validateCvFile(file);
  if (problem) return CV_FILE_PROBLEMS[problem];
  try {
    await files.set(FILE_KEYS.cvOriginal, file);
    return null;
  } catch (error) {
    logger.warn("cv not stored", error instanceof Error ? error.name : "unknown");
    return "store_cv_failed";
  }
}

/**
 * The CV upload of history-only mode (story 001-history-only-onboarding): pick or drop a PDF; it is
 * stored on this computer and nothing else happens: no host, no profile.
 */
export function StoreCvOnly({
  files,
  onStored,
  onBack,
}: {
  files: FileStore;
  onStored: () => void;
  onBack: () => void;
}) {
  const t = useT();
  const inputId = useId();
  const [problem, setProblem] = useState<MessageKey | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isWorking, setIsWorking] = useState(false);

  const store = async (file: File | undefined) => {
    if (!file || isWorking) return;
    setIsWorking(true);
    setProblem(null);
    const result = await storeCvFile(files, file);
    setIsWorking(false);
    if (result) setProblem(result);
    else onStored();
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    void store(event.dataTransfer.files[0]);
  };

  return (
    <Card aria-labelledby="store-cv-title">
      <CardHeader>
        <CardTitle id="store-cv-title">{t("store_cv_title")}</CardTitle>
        <CardDescription>{t("store_cv_description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <div
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => {
            setIsDragging(false);
          }}
          onDrop={onDrop}
          className={`flex flex-col items-center gap-2 rounded-lg border-2 border-dashed p-5 text-center text-sm ${isDragging ? "border-primary bg-accent" : "border-input"}`}
        >
          <FileUp aria-hidden="true" className="size-6 text-muted-foreground" />
          <p>{t("upload_drop_hint")}</p>
          <input
            id={inputId}
            type="file"
            accept="application/pdf,.pdf"
            className="sr-only"
            disabled={isWorking}
            onChange={(event) => {
              const [file] = event.currentTarget.files ?? [];
              event.currentTarget.value = "";
              void store(file);
            }}
          />
          <Button asChild variant="outline" size="sm" aria-disabled={isWorking}>
            <label htmlFor={inputId}>{t("upload_choose_file")}</label>
          </Button>
          <p className="text-xs text-muted-foreground">{t("upload_limits")}</p>
        </div>
        {problem ? (
          <Alert role="alert" variant="destructive">
            <AlertTitle>
              <XCircle aria-hidden="true" />
              {t("upload_failed")}
            </AlertTitle>
            <AlertDescription>{t(problem)}</AlertDescription>
          </Alert>
        ) : null}
      </CardContent>
      <CardFooter>
        <Button variant="ghost" onClick={onBack} disabled={isWorking}>
          {t("action_back")}
        </Button>
      </CardFooter>
    </Card>
  );
}
