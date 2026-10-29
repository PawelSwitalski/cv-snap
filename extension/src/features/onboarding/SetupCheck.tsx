import type { ErrorCode } from "@cv-snap/shared";
import { AlertTriangle, CheckCircle2, Loader2, XCircle } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { errorMessageKey } from "@/lib/i18n/error-messages";
import { useT } from "@/lib/i18n/i18n";
import type { MessageKey } from "@/lib/i18n/messages";
import type { NativeHostClient } from "@/lib/native-host-client";
import { isSetupBlocked, runSetupCheck, type SetupCheckResult } from "./setup-check";

/** Fix hint per setup problem (story 002). */
const FIX_HINTS: Partial<Record<ErrorCode, MessageKey>> = {
  HOST_NOT_INSTALLED: "hint_HOST_NOT_INSTALLED",
  HOST_DISCONNECTED: "hint_HOST_DISCONNECTED",
  CLAUDE_NOT_FOUND: "hint_CLAUDE_NOT_FOUND",
  CLAUDE_NOT_AUTHENTICATED: "hint_CLAUDE_NOT_AUTHENTICATED",
  CLAUDE_VERSION_UNSUPPORTED: "hint_CLAUDE_VERSION_UNSUPPORTED",
  HOST_VERSION_MISMATCH: "hint_HOST_VERSION_MISMATCH",
};

type CheckState = { status: "checking" } | { status: "done"; result: SetupCheckResult };

/**
 * Setup check step: each problem gets its own fix hint, errors block "Continue", the version
 * warning doesn't. "Check again" re-runs with a fresh connection.
 */
export function SetupCheck({
  createClient,
  onContinue,
}: {
  createClient: () => NativeHostClient;
  onContinue: () => void;
}) {
  const t = useT();
  const [state, setState] = useState<CheckState>({ status: "checking" });

  const check = useCallback(
    (signal?: AbortSignal) => {
      setState({ status: "checking" });
      void runSetupCheck(createClient, signal).then((result) => {
        if (!signal?.aborted) setState({ status: "done", result });
      });
    },
    [createClient],
  );

  useEffect(() => {
    const controller = new AbortController();
    check(controller.signal);
    return () => {
      controller.abort();
    };
  }, [check]);

  const isBlocked = state.status === "done" && isSetupBlocked(state.result);
  const issues = state.status === "done" ? state.result.issues : [];

  return (
    <Card aria-labelledby="setup-title">
      <CardHeader>
        <CardTitle id="setup-title">{t("setup_title")}</CardTitle>
      </CardHeader>
      <CardContent>
        <div aria-live="polite" className="text-sm">
          {state.status === "checking" ? (
            <p className="flex items-center gap-2">
              <Loader2 aria-hidden="true" className="size-4 animate-spin" />
              {t("setup_checking")}
            </p>
          ) : issues.length === 0 ? (
            <p className="flex items-center gap-2">
              <CheckCircle2 aria-hidden="true" className="size-4" />
              {t("setup_all_good")}
            </p>
          ) : null}
        </div>
        {issues.map((issue) => (
          <Alert
            key={issue.code}
            role={issue.severity === "error" ? "alert" : "status"}
            variant={issue.severity === "error" ? "destructive" : "warning"}
          >
            <AlertTitle>
              {issue.severity === "error" ? (
                <XCircle aria-hidden="true" />
              ) : (
                <AlertTriangle aria-hidden="true" />
              )}
              {issue.severity === "error" ? t("setup_problem") : t("setup_warning")}
              {": "}
              {t(errorMessageKey(issue.code))}
            </AlertTitle>
            {FIX_HINTS[issue.code] ? (
              <AlertDescription>{t(FIX_HINTS[issue.code] ?? "error_UNEXPECTED")}</AlertDescription>
            ) : null}
          </Alert>
        ))}
      </CardContent>
      <CardFooter>
        <Button onClick={onContinue} disabled={state.status !== "done" || isBlocked}>
          {t("setup_continue")}
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            check();
          }}
          disabled={state.status === "checking"}
        >
          {t("setup_check_again")}
        </Button>
      </CardFooter>
    </Card>
  );
}
