import { mkdirSync, mkdtempSync, rmdirSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { CvSnapError, type ModelId, type Prompt } from "@cv-snap/shared";
import type { ClaudeCommand } from "../health/find-claude.js";
import type { ProcessRunner, RunProcessResult } from "../lib/run-process.js";

/** Hard limit per Claude call (NFR "Hard timeout per Claude call"). */
export const CLAUDE_TIMEOUT_MS = 120_000;
/** Structured output takes one extra internal turn (spike 001); 3 leaves room, nothing more. */
export const CLAUDE_MAX_TURNS = 3;
/** With `--json-schema`, Claude Code adds this one internal tool to carry the answer (spike 001). */
const ALLOWED_TOOLS = ["StructuredOutput"];

export const MODEL_UNAVAILABLE_MESSAGE =
  "The selected model isn't available on your Claude plan. Choose another model in settings.";

export interface StructuredRunOptions {
  claude: ClaudeCommand | null;
  model: ModelId;
  prompt: Prompt;
  jsonSchema: Record<string, unknown>;
  signal: AbortSignal;
  run: ProcessRunner;
  /** Parent of the per-run directories, e.g. `%LOCALAPPDATA%\cv-snap\run`. */
  workRoot: string;
  timeoutMs?: number;
  /** Claude Code's config directory (to tidy the empty project stub it creates per cwd). */
  claudeConfigDir?: string;
}

/**
 * Headless Claude Code arguments verified in spike 001: no built-in tools, no MCP servers, no
 * user/project settings or hooks, no saved session, structured output validated by the CLI.
 */
export function buildClaudeArgs(
  model: ModelId,
  jsonSchema: Record<string, unknown>,
  systemPromptFile: string,
): string[] {
  return [
    "-p",
    "--model",
    model,
    "--output-format",
    "stream-json",
    "--verbose",
    "--json-schema",
    JSON.stringify(jsonSchema),
    "--tools",
    "",
    "--strict-mcp-config",
    "--setting-sources",
    "",
    "--no-session-persistence",
    "--system-prompt-file",
    systemPromptFile,
    "--max-turns",
    String(CLAUDE_MAX_TURNS),
  ];
}

/**
 * Runs one structured Claude call in a fresh, empty working directory that is deleted afterwards,
 * and returns the CLI-validated `structured_output` (still `unknown`: callers validate with zod).
 */
export async function runStructured(options: StructuredRunOptions): Promise<unknown> {
  if (!options.claude) throw new CvSnapError("CLAUDE_NOT_FOUND", "Claude Code was not found");
  mkdirSync(options.workRoot, { recursive: true });
  const runDir = mkdtempSync(join(options.workRoot, "run-"));
  const cwd = join(runDir, "cwd");
  const systemPromptFile = join(runDir, "system-prompt.txt");
  try {
    mkdirSync(cwd);
    writeFileSync(systemPromptFile, options.prompt.system, "utf8");
    const result = await options.run({
      command: options.claude.command,
      args: [
        ...options.claude.prefixArgs,
        ...buildClaudeArgs(options.model, options.jsonSchema, systemPromptFile),
      ],
      stdin: options.prompt.user,
      cwd,
      timeoutMs: options.timeoutMs ?? CLAUDE_TIMEOUT_MS,
      signal: options.signal,
      maxOutputBytes: 8 * 1024 * 1024,
    });
    return interpretRun(result);
  } finally {
    rmSync(runDir, { recursive: true, force: true });
    removeEmptyProjectStub(cwd, options.claudeConfigDir);
  }
}

interface StreamEvent {
  type?: unknown;
  subtype?: unknown;
  tools?: unknown;
  mcp_servers?: unknown;
  message?: { content?: unknown };
  is_error?: unknown;
  api_error_status?: unknown;
  terminal_reason?: unknown;
  result?: unknown;
  structured_output?: unknown;
}

/**
 * Turns a finished `claude -p --output-format stream-json` run into the structured output or a
 * typed error. Error shapes are the ones observed in spike 001. Messages never include model
 * output, which may contain CV or job-ad text.
 */
export function interpretRun(run: RunProcessResult): unknown {
  if (run.spawnErrorCode === "ENOENT") {
    throw new CvSnapError("CLAUDE_NOT_FOUND", "Claude Code was not found");
  }
  if (run.spawnErrorCode) {
    throw new CvSnapError("GENERATION_FAILED", "Claude Code could not be started", {
      reason: "SPAWN_FAILED",
    });
  }
  if (run.isAborted) throw new CvSnapError("CANCELLED", "Request was cancelled");
  if (run.isTimedOut) {
    throw new CvSnapError("GENERATION_TIMEOUT", "Claude didn't answer within the time limit");
  }

  const events = parseEvents(run.stdout);
  assertLockdown(events);

  const result = events.findLast((event) => event.type === "result");
  const isModelError =
    result?.api_error_status === 404 || run.stderr.includes("[claude-code:unrecognized_model]");
  if (isModelError) throw new CvSnapError("MODEL_UNAVAILABLE", MODEL_UNAVAILABLE_MESSAGE);
  if (!result) {
    throw new CvSnapError("GENERATION_FAILED", "Claude returned no result", {
      reason: "INVALID_OUTPUT",
    });
  }
  if (result.is_error === true || run.exitCode !== 0) {
    if (typeof result.result === "string" && result.result.startsWith("Not logged in")) {
      throw new CvSnapError("CLAUDE_NOT_AUTHENTICATED", "Claude Code is not logged in");
    }
    const reason = result.terminal_reason === "max_turns" ? "MAX_TURNS" : "CLAUDE_ERROR";
    throw new CvSnapError("GENERATION_FAILED", "Claude reported an error", { reason });
  }
  if (result.structured_output === undefined) {
    throw new CvSnapError("GENERATION_FAILED", "Claude returned no structured output", {
      reason: "INVALID_OUTPUT",
    });
  }
  return result.structured_output;
}

function parseEvents(stdout: string): StreamEvent[] {
  const events: StreamEvent[] = [];
  for (const line of stdout.split(/\r?\n/)) {
    if (!line.trim()) continue;
    try {
      const parsed: unknown = JSON.parse(line);
      if (typeof parsed === "object" && parsed !== null) events.push(parsed);
    } catch {
      // Non-JSON lines are ignored; a missing result event is reported below.
    }
  }
  return events;
}

/**
 * Runtime check of the tool lockdown (spike 001 risk "new injected tool sources"): the session must
 * start with no tools except StructuredOutput and no MCP servers, and use no other tool.
 */
function assertLockdown(events: StreamEvent[]): void {
  const violation = () =>
    new CvSnapError("GENERATION_FAILED", "Claude Code ran with tools enabled; result discarded", {
      reason: "LOCKDOWN_VIOLATION",
    });
  const init = events.find((event) => event.type === "system" && event.subtype === "init");
  if (init) {
    const tools = Array.isArray(init.tools) ? init.tools : [];
    const mcpServers = Array.isArray(init.mcp_servers) ? init.mcp_servers : [];
    if (mcpServers.length > 0 || tools.some((tool) => !ALLOWED_TOOLS.includes(String(tool)))) {
      throw violation();
    }
  }
  for (const event of events) {
    if (event.type !== "assistant" || !Array.isArray(event.message?.content)) continue;
    for (const block of event.message.content) {
      if (typeof block !== "object" || block === null) continue;
      const { type, name } = block as { type?: unknown; name?: unknown };
      if (type === "tool_use" && !ALLOWED_TOOLS.includes(String(name))) throw violation();
    }
  }
}

/**
 * Claude Code creates `<config>/projects/<cwd-slug>/memory/` for every new cwd, even without a
 * saved session (spike 001). Remove it for our temp cwd, but only while it is empty.
 */
export function removeEmptyProjectStub(cwd: string, claudeConfigDir?: string): void {
  const configDir = claudeConfigDir ?? process.env.CLAUDE_CONFIG_DIR ?? join(homedir(), ".claude");
  const stub = join(configDir, "projects", cwd.replace(/[^A-Za-z0-9-]/g, "-"));
  for (const dir of [join(stub, "memory"), stub]) {
    try {
      rmdirSync(dir); // fails, harmlessly, unless the directory exists and is empty
    } catch {
      // not there or not empty: leave it alone
    }
  }
}
