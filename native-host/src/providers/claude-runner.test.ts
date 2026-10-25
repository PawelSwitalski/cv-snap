import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { runProcess, type RunProcessOptions, type RunProcessResult } from "../lib/run-process.js";
import {
  buildClaudeArgs,
  interpretRun,
  MODEL_UNAVAILABLE_MESSAGE,
  removeEmptyProjectStub,
  runStructured,
} from "./claude-runner.js";

/** Real transcript from Claude Code 2.1.302 (Stage 3 smoke run), reduced to the fields we read. */
const SUCCESS_STDOUT = readFileSync(
  new URL("../../test/fixtures/claude/success.jsonl", import.meta.url),
  "utf8",
);
const events = () =>
  SUCCESS_STDOUT.trim()
    .split("\n")
    .map((line) => JSON.parse(line) as Record<string, unknown>);
const jsonl = (list: unknown[]) => list.map((event) => JSON.stringify(event)).join("\n");

const run = (partial: Partial<RunProcessResult>): RunProcessResult => ({
  exitCode: 0,
  stdout: SUCCESS_STDOUT,
  stderr: "",
  isTimedOut: false,
  isAborted: false,
  spawnErrorCode: null,
  ...partial,
});

/** Error result as observed in spike 001 (invalid model / logged out). */
const errorResult = (fields: Record<string, unknown>) =>
  jsonl([
    { type: "system", subtype: "init", tools: ["StructuredOutput"], mcp_servers: [] },
    { type: "result", subtype: "success", is_error: true, num_turns: 1, ...fields },
  ]);

describe("buildClaudeArgs", () => {
  it("disables every tool source, saves nothing, caps turns and selects the model", () => {
    const args = buildClaudeArgs(
      "claude-sonnet-5-5",
      { type: "object" },
      "C:\\run\\system-prompt.txt",
    );

    expect(args).toEqual([
      "-p",
      "--model",
      "claude-sonnet-5-5",
      "--output-format",
      "stream-json",
      "--verbose",
      "--json-schema",
      '{"type":"object"}',
      "--tools",
      "",
      "--strict-mcp-config",
      "--setting-sources",
      "",
      "--no-session-persistence",
      "--system-prompt-file",
      "C:\\run\\system-prompt.txt",
      "--max-turns",
      "3",
    ]);
  });
});

describe("interpretRun", () => {
  it("returns structured_output from a real successful transcript", () => {
    expect(interpretRun(run({}))).toMatchObject({
      title: "Junior Python Developer",
      company: null,
    });
  });

  it.each([
    ["a built-in tool in the session", { tools: ["StructuredOutput", "Bash"], mcp_servers: [] }],
    ["an MCP server in the session", { tools: ["StructuredOutput"], mcp_servers: [{ name: "x" }] }],
  ])("rejects %s as LOCKDOWN_VIOLATION", (_label, init) => {
    const stdout = jsonl(
      events().map((event) => (event.subtype === "init" ? { ...event, ...init } : event)),
    );

    expect(() => interpretRun(run({ stdout }))).toThrow(
      expect.objectContaining({ code: "GENERATION_FAILED", reason: "LOCKDOWN_VIOLATION" }),
    );
  });

  it("rejects a tool call other than StructuredOutput as LOCKDOWN_VIOLATION", () => {
    const stdout = jsonl([
      ...events().slice(0, 1),
      { type: "assistant", message: { content: [{ type: "tool_use", name: "Read", input: {} }] } },
      ...events().slice(1),
    ]);

    expect(() => interpretRun(run({ stdout }))).toThrow(
      expect.objectContaining({ reason: "LOCKDOWN_VIOLATION" }),
    );
  });

  it("maps an unknown model (404 / unrecognized_model) to MODEL_UNAVAILABLE with a hint", () => {
    const viaStatus = run({ exitCode: 1, stdout: errorResult({ api_error_status: 404 }) });
    const viaStderr = run({
      exitCode: 1,
      stdout: "",
      stderr: '[claude-code:unrecognized_model] {"model":"x"}\n',
    });

    for (const failed of [viaStatus, viaStderr]) {
      expect(() => interpretRun(failed)).toThrow(
        expect.objectContaining({ code: "MODEL_UNAVAILABLE", message: MODEL_UNAVAILABLE_MESSAGE }),
      );
    }
  });

  it("maps a logged-out CLI to CLAUDE_NOT_AUTHENTICATED", () => {
    const stdout = errorResult({
      api_error_status: null,
      result: "Not logged in · Please run /login",
    });

    expect(() => interpretRun(run({ exitCode: 1, stdout }))).toThrow(
      expect.objectContaining({ code: "CLAUDE_NOT_AUTHENTICATED" }),
    );
  });

  it.each([
    ["max_turns", "MAX_TURNS"],
    ["api_error", "CLAUDE_ERROR"],
  ])("maps other errors (terminal_reason %s) to GENERATION_FAILED/%s", (terminalReason, reason) => {
    const stdout = errorResult({ api_error_status: 500, terminal_reason: terminalReason });

    expect(() => interpretRun(run({ exitCode: 1, stdout }))).toThrow(
      expect.objectContaining({ code: "GENERATION_FAILED", reason }),
    );
  });

  it("maps non-JSON output and a missing structured_output to INVALID_OUTPUT (retryable)", () => {
    const noStructured = jsonl(
      events().map((event) =>
        event.type === "result" ? { ...event, structured_output: undefined } : event,
      ),
    );

    for (const stdout of ["Here is your CV, as requested!", noStructured]) {
      expect(() => interpretRun(run({ stdout }))).toThrow(
        expect.objectContaining({ code: "GENERATION_FAILED", reason: "INVALID_OUTPUT" }),
      );
    }
  });

  it.each([
    [{ spawnErrorCode: "ENOENT" }, "CLAUDE_NOT_FOUND"],
    [{ spawnErrorCode: "EACCES" }, "GENERATION_FAILED"],
    [{ isAborted: true, exitCode: null }, "CANCELLED"],
    [{ isTimedOut: true, exitCode: null }, "GENERATION_TIMEOUT"],
  ] as const)("maps %j to %s", (partial, code) => {
    expect(() => interpretRun(run(partial))).toThrow(expect.objectContaining({ code }));
  });

  it("never puts model output into error messages", () => {
    const stdout = errorResult({ api_error_status: 500, result: "Jan Testowy's CV says…" });

    try {
      interpretRun(run({ exitCode: 1, stdout }));
      expect.unreachable();
    } catch (error) {
      expect((error as Error).message).not.toContain("Jan Testowy");
    }
  });
});

describe("runStructured", () => {
  const dirs: string[] = [];
  const tempDir = () => {
    const dir = mkdtempSync(join(tmpdir(), "cvsnap-runner-"));
    dirs.push(dir);
    return dir;
  };
  afterEach(() => {
    for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
  });

  const base = (workRoot: string) => ({
    claude: { command: "claude.exe", prefixArgs: ["--prefix"], source: "winget" as const },
    model: "claude-haiku-5-5" as const,
    prompt: { system: "SYSTEM RULES", user: "USER DATA" },
    jsonSchema: { type: "object" },
    signal: new AbortController().signal,
    workRoot,
    claudeConfigDir: join(workRoot, "claude-config"),
  });

  it("runs in a fresh empty cwd with the prompt on stdin and the system prompt in a file", async () => {
    const workRoot = tempDir();
    let seen:
      { options: RunProcessOptions; cwdEntries: string[]; systemPrompt: string } | undefined;
    const fakeRun = (options: RunProcessOptions) => {
      const promptFile = options.args[options.args.indexOf("--system-prompt-file") + 1] ?? "";
      seen = {
        options,
        cwdEntries: readdirSync(options.cwd ?? ""),
        systemPrompt: readFileSync(promptFile, "utf8"),
      };
      return Promise.resolve(run({}));
    };

    const output = await runStructured({ ...base(workRoot), run: fakeRun });

    expect(output).toMatchObject({ title: "Junior Python Developer" });
    expect(seen?.options.command).toBe("claude.exe");
    expect(seen?.options.args.slice(0, 4)).toEqual([
      "--prefix",
      "-p",
      "--model",
      "claude-haiku-5-5",
    ]);
    expect(seen?.options.stdin).toBe("USER DATA");
    expect(seen?.options.timeoutMs).toBe(120_000);
    expect(seen?.cwdEntries).toEqual([]);
    expect(seen?.systemPrompt).toBe("SYSTEM RULES");
    expect(readdirSync(workRoot).filter((name) => name.startsWith("run-"))).toEqual([]);
  });

  it("deletes the run directory when the run fails", async () => {
    const workRoot = tempDir();

    await expect(
      runStructured({ ...base(workRoot), run: () => Promise.resolve(run({ stdout: "nope" })) }),
    ).rejects.toMatchObject({ reason: "INVALID_OUTPUT" });
    expect(readdirSync(workRoot).filter((name) => name.startsWith("run-"))).toEqual([]);
  });

  it("deletes the run directory when the process runner throws", async () => {
    const workRoot = tempDir();

    await expect(
      runStructured({ ...base(workRoot), run: () => Promise.reject(new Error("boom")) }),
    ).rejects.toThrow("boom");
    expect(readdirSync(workRoot).filter((name) => name.startsWith("run-"))).toEqual([]);
  });

  it("fails with CLAUDE_NOT_FOUND without creating anything when the CLI is missing", async () => {
    const workRoot = join(tempDir(), "not-created");

    await expect(
      runStructured({ ...base(workRoot), claude: null, run: () => Promise.resolve(run({})) }),
    ).rejects.toMatchObject({ code: "CLAUDE_NOT_FOUND" });
    expect(existsSync(workRoot)).toBe(false);
  });

  /** A real child process that never answers stands in for a hanging `claude`. */
  const hangingClaude = {
    command: process.execPath,
    prefixArgs: ["-e", "setInterval(() => {}, 1000)", "--"],
    source: "path" as const,
  };

  it("kills a run that exceeds the timeout and returns GENERATION_TIMEOUT", async () => {
    const workRoot = tempDir();

    await expect(
      runStructured({ ...base(workRoot), claude: hangingClaude, run: runProcess, timeoutMs: 300 }),
    ).rejects.toMatchObject({ code: "GENERATION_TIMEOUT" });
    expect(readdirSync(workRoot).filter((name) => name.startsWith("run-"))).toEqual([]);
  });

  it("kills the child within 2 s on cancel and returns CANCELLED", async () => {
    const workRoot = tempDir();
    const controller = new AbortController();
    setTimeout(() => {
      controller.abort();
    }, 200);
    const startedAt = Date.now();

    await expect(
      runStructured({
        ...base(workRoot),
        claude: hangingClaude,
        run: runProcess,
        signal: controller.signal,
      }),
    ).rejects.toMatchObject({ code: "CANCELLED" });
    expect(Date.now() - startedAt).toBeLessThan(2200);
    expect(readdirSync(workRoot).filter((name) => name.startsWith("run-"))).toEqual([]);
  });
});

describe("removeEmptyProjectStub", () => {
  it("removes Claude's empty project stub for our cwd but keeps a non-empty one", () => {
    const config = mkdtempSync(join(tmpdir(), "cvsnap-claude-config-"));
    try {
      const emptyCwd = "C:\\Users\\x\\AppData\\Local\\cv-snap\\run\\run-abc\\cwd";
      const usedCwd = "C:\\Users\\x\\AppData\\Local\\cv-snap\\run\\run-def\\cwd";
      const slug = (cwd: string) => cwd.replace(/[^A-Za-z0-9-]/g, "-");
      mkdirSync(join(config, "projects", slug(emptyCwd), "memory"), { recursive: true });
      mkdirSync(join(config, "projects", slug(usedCwd), "memory"), { recursive: true });
      writeFileSync(join(config, "projects", slug(usedCwd), "session.jsonl"), "{}");

      removeEmptyProjectStub(emptyCwd, config);
      removeEmptyProjectStub(usedCwd, config);

      expect(existsSync(join(config, "projects", slug(emptyCwd)))).toBe(false);
      expect(existsSync(join(config, "projects", slug(usedCwd), "session.jsonl"))).toBe(true);
    } finally {
      rmSync(config, { recursive: true, force: true });
    }
  });
});
