import { getHealthIssues } from "@cv-snap/shared";
import { describe, expect, it } from "vitest";
import type { RunProcessOptions, RunProcessResult } from "../lib/run-process.js";
import { checkHealth, parseLoggedIn } from "./check-health.js";
import type { ClaudeCommand } from "./find-claude.js";

const CLAUDE: ClaudeCommand = { command: "C:\\claude.exe", prefixArgs: [], source: "winget" };

const result = (partial: Partial<RunProcessResult>): RunProcessResult => ({
  exitCode: 0,
  stdout: "",
  stderr: "",
  isTimedOut: false,
  isAborted: false,
  spawnErrorCode: null,
  ...partial,
});

const LOGGED_IN = JSON.stringify({
  loggedIn: true,
  authMethod: "claude.ai",
  email: "jan.testowy@example.com",
  orgName: "Jan's Organization",
});

/** Fake CLI: answers `--version` and `auth status --json` like Claude Code 2.1.302 (spike 001). */
function fakeCli(version: Partial<RunProcessResult>, auth: Partial<RunProcessResult>, delayMs = 0) {
  const calls: RunProcessOptions[] = [];
  const run = async (options: RunProcessOptions) => {
    calls.push(options);
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    return result(options.args.includes("--version") ? version : auth);
  };
  return { run, calls };
}

describe("checkHealth", () => {
  it("reports a found, logged-in, supported CLI", async () => {
    const cli = fakeCli({ stdout: "2.1.302 (Claude Code)\n" }, { stdout: LOGGED_IN });

    const report = await checkHealth({ findClaude: () => CLAUDE, run: cli.run });

    expect(report).toEqual({
      hostVersion: "0.1.0",
      claudeFound: true,
      claudeVersion: "2.1.302",
      isAuthenticated: true,
      isVersionSupported: true,
    });
    expect(getHealthIssues(report)).toEqual([]);
  });

  it("reports CLAUDE_NOT_FOUND without running anything when the CLI is missing", async () => {
    const cli = fakeCli({}, {});

    const report = await checkHealth({ findClaude: () => null, run: cli.run });

    expect(cli.calls).toEqual([]);
    expect(getHealthIssues(report)).toEqual([{ code: "CLAUDE_NOT_FOUND", severity: "error" }]);
  });

  it("reports CLAUDE_NOT_FOUND when the found binary can't be started (ENOENT)", async () => {
    const cli = fakeCli({ spawnErrorCode: "ENOENT" }, { spawnErrorCode: "ENOENT" });

    const report = await checkHealth({ findClaude: () => CLAUDE, run: cli.run });

    expect(report.claudeFound).toBe(false);
  });

  it("reports CLAUDE_NOT_AUTHENTICATED for a logged-out CLI", async () => {
    const cli = fakeCli(
      { stdout: "2.1.302 (Claude Code)" },
      { exitCode: 1, stdout: '{"loggedIn": false, "authMethod": "none"}' },
    );

    const report = await checkHealth({ findClaude: () => CLAUDE, run: cli.run });

    expect(getHealthIssues(report)).toEqual([
      { code: "CLAUDE_NOT_AUTHENTICATED", severity: "error" },
    ]);
  });

  it("warns, without failing, when the version is older than the tested minimum", async () => {
    const cli = fakeCli({ stdout: "2.1.250 (Claude Code)" }, { stdout: LOGGED_IN });

    const report = await checkHealth({ findClaude: () => CLAUDE, run: cli.run });

    expect(report.claudeVersion).toBe("2.1.250");
    expect(getHealthIssues(report)).toEqual([
      { code: "CLAUDE_VERSION_UNSUPPORTED", severity: "warning" },
    ]);
  });

  it("treats an unreadable version as unsupported (warning only)", async () => {
    const cli = fakeCli({ isTimedOut: true }, { stdout: LOGGED_IN });

    const report = await checkHealth({ findClaude: () => CLAUDE, run: cli.run });

    expect(report).toMatchObject({
      claudeFound: true,
      claudeVersion: null,
      isVersionSupported: false,
    });
  });

  it("runs both probes in parallel, without a shell-free argument mix-up", async () => {
    const npmClaude: ClaudeCommand = { command: "node.exe", prefixArgs: ["cli.js"], source: "npm" };
    const cli = fakeCli({ stdout: "2.1.302" }, { stdout: LOGGED_IN }, 300);
    const startedAt = Date.now();

    await checkHealth({ findClaude: () => npmClaude, run: cli.run });

    expect(Date.now() - startedAt).toBeLessThan(550);
    expect(cli.calls.map((call) => call.args)).toEqual([
      ["cli.js", "--version"],
      ["cli.js", "auth", "status", "--json"],
    ]);
    expect(cli.calls.every((call) => call.timeoutMs <= 5000)).toBe(true);
  });

  it("never puts the account email or organisation into the report", async () => {
    const cli = fakeCli({ stdout: "2.1.302" }, { stdout: LOGGED_IN });

    const report = await checkHealth({ findClaude: () => CLAUDE, run: cli.run });

    expect(JSON.stringify(report)).not.toMatch(/example\.com|Organization/);
  });
});

describe("parseLoggedIn", () => {
  it.each([
    ['{"loggedIn": true}', true],
    ['{"loggedIn": false}', false],
    ['{"loggedIn": "yes"}', false],
    ["{}", false],
    ["null", false],
    ["not json", false],
    ["", false],
  ])("reads %j as %s", (stdout, expected) => {
    expect(parseLoggedIn(stdout)).toBe(expected);
  });
});
