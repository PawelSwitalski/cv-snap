import { XCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { formatMessage, resolveLanguage } from "@/lib/i18n/messages";

/**
 * Error boundary fallback. It can't rely on the i18n context (that may be what failed), so it
 * resolves the browser language itself. "Try again" re-renders the panel from stored state (story
 * 007-error-messages: a recovery screen, never a blank panel); "Reload" is the fallback.
 */
export function PanelError({
  browserLanguage,
  onRetry,
}: {
  browserLanguage: string | undefined;
  onRetry?: () => void;
}) {
  const language = resolveLanguage("auto", browserLanguage);
  return (
    <main className="p-4">
      <Alert role="alert" variant="destructive">
        <AlertTitle>
          <XCircle aria-hidden="true" />
          {formatMessage(language, "panel_error_title")}
        </AlertTitle>
        <AlertDescription className="flex flex-col items-start gap-2">
          {formatMessage(language, "panel_error_description")}
          <div className="flex flex-wrap gap-2">
            {onRetry ? (
              <Button size="sm" onClick={onRetry}>
                {formatMessage(language, "panel_error_retry")}
              </Button>
            ) : null}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                location.reload();
              }}
            >
              {formatMessage(language, "panel_error_reload")}
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    </main>
  );
}
