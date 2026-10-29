import type { ErrorCode } from "./errors.js";
import type { HealthReport } from "./protocol.js";

/** Oldest Claude Code version verified in spike 001 (bolt 001-native-host). */
export const MIN_CLAUDE_CODE_VERSION = "2.1.302";

export type HealthIssueSeverity = "error" | "warning";

export interface HealthIssue {
  code: ErrorCode;
  /** `error` blocks generation; `warning` only shows an update hint (story 004-health-check). */
  severity: HealthIssueSeverity;
}

/**
 * Turns a host health report into the problems the UI must show, most fundamental first.
 * A missing CLI hides the login/version issues, which can't be checked without it.
 */
export function getHealthIssues(report: HealthReport, extensionVersion?: string): HealthIssue[] {
  const versionIssues: HealthIssue[] =
    extensionVersion !== undefined && !isSameMajorMinor(report.hostVersion, extensionVersion)
      ? [{ code: "HOST_VERSION_MISMATCH", severity: "warning" }]
      : [];
  if (!report.claudeFound) {
    return [{ code: "CLAUDE_NOT_FOUND", severity: "error" }, ...versionIssues];
  }
  const issues: HealthIssue[] = [];
  if (!report.isAuthenticated) issues.push({ code: "CLAUDE_NOT_AUTHENTICATED", severity: "error" });
  if (!report.isVersionSupported) {
    issues.push({ code: "CLAUDE_VERSION_UNSUPPORTED", severity: "warning" });
  }
  return [...issues, ...versionIssues];
}

/**
 * Host and extension are released together (story 006); a patch difference is fine, a major or
 * minor one may mean a protocol change. Unparseable versions count as different.
 */
export function isSameMajorMinor(a: string, b: string): boolean {
  const majorMinor = (value: string) => /^\s*v?(\d+)\.(\d+)/.exec(value)?.slice(1, 3).join(".");
  const left = majorMinor(a);
  return left !== undefined && left === majorMinor(b);
}

/**
 * Compares dotted numeric versions ("2.1.302"); anything after the numbers (e.g. " (Claude Code)")
 * is ignored. Returns null when `version` has no leading number.
 */
export function isVersionAtLeast(version: string, minimum: string): boolean | null {
  const parse = (value: string) => /^\s*(\d+(?:\.\d+)*)/.exec(value)?.[1]?.split(".").map(Number);
  const actual = parse(version);
  const required = parse(minimum);
  if (!actual || !required) return null;
  for (let index = 0; index < Math.max(actual.length, required.length); index++) {
    const difference = (actual[index] ?? 0) - (required[index] ?? 0);
    if (difference !== 0) return difference > 0;
  }
  return true;
}
