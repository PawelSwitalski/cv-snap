import { CvSnapError, getHealthIssues, type HealthIssue, type HealthReport } from "@cv-snap/shared";
import type { NativeHostClient } from "@/lib/native-host-client";

export interface SetupCheckResult {
  /** Problems, most fundamental first; `error` blocks onboarding, `warning` doesn't. */
  issues: HealthIssue[];
  report: HealthReport | null;
}

const CHECK_TIMEOUT_MS = 10_000;

/**
 * Runs the setup check (story 002): host reachable, Claude Code found, logged in, new enough.
 * Uses a **fresh** connection each time and closes it afterwards, so a host installed while the
 * panel is open is found by "Check again" without reloading.
 */
export async function runSetupCheck(
  createClient: () => NativeHostClient,
  signal?: AbortSignal,
): Promise<SetupCheckResult> {
  const client = createClient();
  const timeout = AbortSignal.timeout(CHECK_TIMEOUT_MS);
  const combined = signal ? AbortSignal.any([signal, timeout]) : timeout;
  try {
    const report = await client.request<"health">({ type: "health" }, { signal: combined });
    return { issues: getHealthIssues(report), report };
  } catch (error) {
    const code =
      error instanceof CvSnapError && error.code === "HOST_NOT_INSTALLED"
        ? "HOST_NOT_INSTALLED"
        : "HOST_DISCONNECTED";
    return { issues: [{ code, severity: "error" }], report: null };
  } finally {
    client.disconnect();
  }
}

export function isSetupBlocked(result: SetupCheckResult): boolean {
  return result.issues.some((issue) => issue.severity === "error");
}
