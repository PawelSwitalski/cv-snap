import type { ErrorCode, ErrorPayload } from "@cv-snap/shared";
import {
  AlertTriangle,
  ArrowLeft,
  MousePointerClick,
  PlugZap,
  RotateCcw,
  WifiOff,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { errorFixKey, errorMessageKey } from "@/lib/i18n/error-messages";
import { useT } from "@/lib/i18n/i18n";

/** The one recovery action offered for an error (story 007). */
export type ErrorAction = "reconnect" | "retry" | "select-text" | "none";

const ACTIONS: Record<ErrorCode, ErrorAction> = {
  HOST_DISCONNECTED: "reconnect",
  HOST_NOT_INSTALLED: "retry",
  CLAUDE_NOT_FOUND: "retry",
  CLAUDE_NOT_AUTHENTICATED: "retry",
  CLAUDE_VERSION_UNSUPPORTED: "retry",
  MODEL_UNAVAILABLE: "retry",
  GENERATION_TIMEOUT: "retry",
  GENERATION_FAILED: "retry",
  MESSAGE_TOO_LARGE: "none",
  INVALID_MESSAGE: "retry",
  PDF_PARSE_FAILED: "none",
  JOB_AD_NOT_DETECTED: "select-text",
  CANCELLED: "none",
};

export function errorAction(error: Pick<ErrorPayload, "code" | "reason">): ErrorAction {
  // Adding the site is done with the Generate button, which shows "Add this site" by then.
  if (error.code === "JOB_AD_NOT_DETECTED" && error.reason === "SITE_NOT_ALLOWED") return "none";
  if (error.code === "GENERATION_FAILED" && error.reason === "PROFILE_NOT_CONFIRMED") return "none";
  return ACTIONS[error.code];
}

/**
 * A failed generation (story 007): what happened, how to fix it, and one action. Reconnect and
 * Try again repeat the same request (the background's host client reconnects on the next
 * request). When the browser is offline, a line points to the connection and Claude availability.
 */
export function GenerationError({
  error,
  isOffline,
  hasResult,
  onRetry,
  onDismiss,
}: {
  error: ErrorPayload;
  isOffline: boolean;
  hasResult: boolean;
  onRetry: () => void;
  onDismiss: () => void;
}) {
  const t = useT();
  const action = errorAction(error);
  return (
    <Alert role="alert" variant="destructive">
      <AlertTitle>
        <AlertTriangle aria-hidden="true" />
        {t(errorMessageKey(error.code, error.reason))}
      </AlertTitle>
      <AlertDescription className="flex flex-col items-start gap-2">
        <p>{t(errorFixKey(error.code, error.reason))}</p>
        {isOffline ? (
          <p className="flex items-center gap-1">
            <WifiOff aria-hidden="true" className="size-4 shrink-0" />
            {t("error_offline_hint")}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          {action === "reconnect" ? (
            <Button size="sm" onClick={onRetry}>
              <PlugZap aria-hidden="true" />
              {t("error_action_reconnect")}
            </Button>
          ) : null}
          {action === "retry" ? (
            <Button size="sm" onClick={onRetry}>
              <RotateCcw aria-hidden="true" />
              {t("error_action_retry")}
            </Button>
          ) : null}
          {action === "select-text" ? (
            <Button size="sm" onClick={onRetry}>
              <MousePointerClick aria-hidden="true" />
              {t("error_action_selected")}
            </Button>
          ) : null}
          <Button size="sm" variant="outline" onClick={onDismiss}>
            <ArrowLeft aria-hidden="true" />
            {t(hasResult ? "error_action_back_to_result" : "error_action_back")}
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}
