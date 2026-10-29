import type { CvProfileContent, ModelId } from "@cv-snap/shared";
import { FileUp, Loader2, XCircle } from "lucide-react";
import { useEffect, useId, useRef, useState, type DragEvent } from "react";
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
import { Progress } from "@/components/ui/progress";
import { messageKeyFor } from "@/lib/i18n/error-messages";
import { useT } from "@/lib/i18n/i18n";
import type { MessageKey } from "@/lib/i18n/messages";
import { logger } from "@/lib/logger";
import {
  createProfileFromPdf,
  type CreateProfileDeps,
  type UploadStep,
} from "./create-profile-flow";
import { validateCvFile, type CvFileProblem } from "./validate-file";

const STEP_LABELS: Record<UploadStep, MessageKey> = {
  storing: "upload_step_storing",
  "extracting-pdf-text": "upload_step_extracting",
  "creating-profile": "upload_step_creating",
};
const STEP_PROGRESS: Record<UploadStep, number> = {
  storing: 10,
  "extracting-pdf-text": 30,
  "creating-profile": 60,
};
const FILE_PROBLEMS: Record<CvFileProblem, MessageKey> = {
  NOT_PDF: "upload_error_not_pdf",
  TOO_LARGE: "upload_error_too_large",
  EMPTY: "upload_error_empty",
};

type UploadState =
  | { status: "idle" }
  | { status: "working"; step: UploadStep }
  | { status: "failed"; message: MessageKey };

/**
 * CV upload (story 003): pick or drop a PDF, then text extraction and profile creation with
 * progress and Cancel. Closing the panel cancels the run (`pagehide`), and nothing is saved.
 */
export function CvUpload({
  deps,
  model,
  hasActiveProfile,
  onDraftCreated,
  onBack,
}: {
  deps: CreateProfileDeps;
  model: ModelId;
  hasActiveProfile: boolean;
  onDraftCreated: (draft: CvProfileContent) => void;
  onBack?: () => void;
}) {
  const t = useT();
  const inputId = useId();
  const [state, setState] = useState<UploadState>({ status: "idle" });
  const [isDragging, setIsDragging] = useState(false);
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const cancel = () => controllerRef.current?.abort();
    window.addEventListener("pagehide", cancel);
    return () => {
      window.removeEventListener("pagehide", cancel);
      cancel();
    };
  }, []);

  const start = async (file: File) => {
    const problem = await validateCvFile(file);
    if (problem) {
      setState({ status: "failed", message: FILE_PROBLEMS[problem] });
      return;
    }
    const controller = new AbortController();
    controllerRef.current = controller;
    setState({ status: "working", step: "storing" });
    try {
      const draft = await createProfileFromPdf(file, model, deps, {
        signal: controller.signal,
        onStep: (step) => {
          setState({ status: "working", step });
        },
      });
      onDraftCreated(draft);
    } catch (error) {
      if (controller.signal.aborted) {
        // The user cancelled (or closed the panel): back to the start, nothing saved, no error.
        setState({ status: "idle" });
        return;
      }
      logger.warn("profile creation failed", error instanceof Error ? error.name : "unknown");
      setState({ status: "failed", message: messageKeyFor(error) });
    } finally {
      controllerRef.current = null;
    }
  };

  const onFiles = (files: FileList | null) => {
    const file = files?.[0];
    if (file) void start(file);
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    if (state.status !== "working") onFiles(event.dataTransfer.files);
  };

  const isWorking = state.status === "working";

  return (
    <Card aria-labelledby="upload-title">
      <CardHeader>
        <CardTitle id="upload-title">{t("upload_title")}</CardTitle>
        <CardDescription>
          {hasActiveProfile ? t("upload_replaces_later") : t("upload_description")}
        </CardDescription>
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
              onFiles(event.currentTarget.files);
              event.currentTarget.value = "";
            }}
          />
          <Button asChild variant="outline" size="sm" aria-disabled={isWorking}>
            <label htmlFor={inputId}>{t("upload_choose_file")}</label>
          </Button>
          <p className="text-xs text-muted-foreground">{t("upload_limits")}</p>
        </div>

        <div aria-live="polite" className="flex flex-col gap-2">
          {isWorking ? (
            <>
              <p className="flex items-center gap-2 text-sm">
                <Loader2 aria-hidden="true" className="size-4 animate-spin" />
                {t(STEP_LABELS[state.step])}
              </p>
              <Progress value={STEP_PROGRESS[state.step]} label={t("upload_progress_label")} />
              <p className="text-xs text-muted-foreground">{t("upload_takes_a_while")}</p>
            </>
          ) : null}
        </div>
        {state.status === "failed" ? (
          <Alert role="alert" variant="destructive">
            <AlertTitle>
              <XCircle aria-hidden="true" />
              {t("upload_failed")}
            </AlertTitle>
            <AlertDescription>{t(state.message)}</AlertDescription>
          </Alert>
        ) : null}
      </CardContent>
      <CardFooter>
        {isWorking ? (
          <Button
            variant="outline"
            onClick={() => {
              controllerRef.current?.abort();
            }}
          >
            {t("upload_cancel")}
          </Button>
        ) : onBack ? (
          <Button variant="ghost" onClick={onBack}>
            {t("action_back")}
          </Button>
        ) : null}
      </CardFooter>
    </Card>
  );
}
