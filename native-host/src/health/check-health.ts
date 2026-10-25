import { isVersionAtLeast, MIN_CLAUDE_CODE_VERSION, type HealthReport } from "@cv-snap/shared";
import { runProcess, type ProcessRunner } from "../lib/run-process.js";
import { HOST_VERSION } from "../version.js";
import { findClaude, type ClaudeCommand } from "./find-claude.js";

/** Each probe is a local CLI call without a model request (about 0.2 s in spike 001). */
const PROBE_TIMEOUT_MS = 4000;

export interface CheckHealthDeps {
  findClaude: () => ClaudeCommand | null;
  run: ProcessRunner;
  signal?: AbortSignal;
}

/**
 * Checks what generation needs: the CLI, its version and the login. `--version` and
 * `auth status --json` run in parallel, so the check stays well under 5 s.
 */
export async function checkHealth(overrides: Partial<CheckHealthDeps> = {}): Promise<HealthReport> {
  const deps: CheckHealthDeps = { findClaude: () => findClaude(), run: runProcess, ...overrides };
  const notFound: HealthReport = {
    hostVersion: HOST_VERSION,
    claudeFound: false,
    claudeVersion: null,
    isAuthenticated: false,
    isVersionSupported: false,
  };

  const claude = deps.findClaude();
  if (!claude) return notFound;

  const probe = (args: string[]) =>
    deps.run({
      command: claude.command,
      args: [...claude.prefixArgs, ...args],
      timeoutMs: PROBE_TIMEOUT_MS,
      ...(deps.signal ? { signal: deps.signal } : {}),
    });
  const [versionRun, authRun] = await Promise.all([
    probe(["--version"]),
    probe(["auth", "status", "--json"]),
  ]);

  if (versionRun.spawnErrorCode === "ENOENT") return notFound;

  const claudeVersion = /\d+(?:\.\d+)+/.exec(versionRun.stdout)?.[0] ?? null;
  return {
    hostVersion: HOST_VERSION,
    claudeFound: true,
    claudeVersion,
    isAuthenticated: parseLoggedIn(authRun.stdout),
    isVersionSupported:
      claudeVersion !== null && isVersionAtLeast(claudeVersion, MIN_CLAUDE_CODE_VERSION) === true,
  };
}

/**
 * Reads only `loggedIn` from `claude auth status --json`. The rest (email, org) is personal data
 * and is never logged or returned. Logged out: exit code 1 and `loggedIn: false` (spike 001).
 */
export function parseLoggedIn(stdout: string): boolean {
  try {
    const status: unknown = JSON.parse(stdout);
    return typeof status === "object" && status !== null && "loggedIn" in status
      ? status.loggedIn === true
      : false;
  } catch {
    return false;
  }
}
