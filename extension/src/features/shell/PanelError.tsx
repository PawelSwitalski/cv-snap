import { XCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { formatMessage, resolveLanguage } from "@/lib/i18n/messages";

/**
 * Error boundary fallback. It can't rely on the i18n context (that may be what failed), so it
 * resolves the browser language itself.
 */
export function PanelError({ browserLanguage }: { browserLanguage: string | undefined }) {
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
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              location.reload();
            }}
          >
            {formatMessage(language, "panel_error_reload")}
          </Button>
        </AlertDescription>
      </Alert>
    </main>
  );
}
