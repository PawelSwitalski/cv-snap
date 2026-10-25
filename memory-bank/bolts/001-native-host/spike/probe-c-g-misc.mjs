// RQ3 models, RQ4 auth, RQ5 hygiene/max-turns, RQ6 cancel, RQ7 input transport.
import { mkdtempSync, existsSync, readdirSync } from "node:fs";
import { tmpdir, homedir } from "node:os";
import { join } from "node:path";
import { spawn, execFileSync } from "node:child_process";
import { runClaude, makeSandbox, killTree, save, redact, LOCKDOWN } from "./run-claude.mjs";

const only = process.argv[2]; // optional: run one group, e.g. "models"
const groups = {};

function brief(run) {
  let envelope = {};
  try {
    envelope = JSON.parse(run.stdout ?? "");
  } catch {
    // non-JSON stdout is itself a finding
  }
  return {
    exitCode: run.exitCode,
    durationMs: run.durationMs,
    spawnError: run.spawnError,
    isError: envelope.is_error,
    subtype: envelope.subtype,
    apiErrorStatus: envelope.api_error_status,
    terminalReason: envelope.terminal_reason,
    numTurns: envelope.num_turns,
    modelUsage: envelope.modelUsage ? Object.keys(envelope.modelUsage) : undefined,
    costUsd: envelope.total_cost_usd,
    ttftMs: envelope.ttft_ms,
    result: String(envelope.result ?? "").slice(0, 300),
    stdoutIfNotJson: envelope.type ? undefined : (run.stdout ?? "").slice(0, 400),
    stderr: (run.stderr ?? "").slice(0, 400),
  };
}

const json = (model, extra = []) =>
  ["-p", "--model", model, "--output-format", "json", ...LOCKDOWN, ...extra];

groups.models = async () => {
  const out = {};
  for (const model of ["haiku", "sonnet", "opus", "claude-haiku-5-5", "claude-sonnet-5-5",
    "claude-opus-5-5", "claude-nonexistent-9-9"]) {
    out[model] = brief(await runClaude({ args: json(model), prompt: "Reply with exactly: OK" }));
    console.log("model", model, JSON.stringify(out[model]));
  }
  return out;
};

groups.auth = async () => {
  // Simulated logged-out: empty, isolated config dir. The real ~/.claude is never touched.
  const emptyConfig = mkdtempSync(join(tmpdir(), "cvsnap-noauth-"));
  const env = { CLAUDE_CONFIG_DIR: emptyConfig, ANTHROPIC_API_KEY: undefined,
    ANTHROPIC_AUTH_TOKEN: undefined, CLAUDE_CODE_OAUTH_TOKEN: undefined };
  const out = {
    authStatusLoggedOut: brief(await runClaude({ args: ["auth", "status", "--json"], env, timeoutMs: 30_000 })),
    authStatusLoggedOutRaw: (await runClaude({ args: ["auth", "status", "--json"], env, timeoutMs: 30_000 })).stdout,
    printLoggedOut: brief(await runClaude({ args: json("haiku"), prompt: "Reply with exactly: OK", env, timeoutMs: 60_000 })),
    authStatusLoggedIn: brief(await runClaude({ args: ["auth", "status", "--json"], timeoutMs: 30_000 })),
    versionCmd: brief(await runClaude({ args: ["--version"], timeoutMs: 30_000 })),
    configDirFilesAfter: readdirSync(emptyConfig),
  };
  console.log("auth", JSON.stringify(out, null, 1));
  return out;
};

groups.hygiene = async () => {
  const { dir } = makeSandbox();
  const projectsDir = join(homedir(), ".claude", "projects");
  const slug = dir.replace(/[:\\/.]/g, "-");
  const out = {
    maxTurnsAccepted: brief(await runClaude({ args: json("haiku", ["--max-turns", "1"]), prompt: "Reply with exactly: OK", cwd: dir })),
    maxTurns1WithSchema: brief(await runClaude({
      args: json("haiku", ["--max-turns", "1", "--json-schema", '{"type":"object","properties":{"ok":{"type":"boolean"}},"required":["ok"]}']),
      prompt: "Return ok=true", cwd: dir })),
    effortLow: brief(await runClaude({ args: json("haiku", ["--effort", "low"]), prompt: "Reply with exactly: OK", cwd: dir })),
    systemPromptOverride: brief(await runClaude({
      args: json("haiku", ["--system-prompt", "You are a JSON-only extraction engine. You have no tools."]),
      prompt: "What tools and skills do you have? One line.", cwd: dir })),
  };
  // Transcript written for this cwd despite --no-session-persistence?
  out.sessionDirExists = existsSync(join(projectsDir, slug));
  out.sessionDirGuess = redact(join(projectsDir, slug));
  console.log("hygiene", JSON.stringify(out, null, 1));
  return out;
};

groups.transport = async () => {
  const marker = `MARK-${Date.now()}`;
  const filler = "Lorem ipsum dolor sit amet, consectetur adipiscing elit. ".repeat(1400); // ~80 KB
  const big = `${filler}\nThe secret marker is ${marker}. Reply with only the secret marker.`;
  const out = {
    promptBytes: Buffer.byteLength(big),
    stdin80k: brief(await runClaude({ args: json("haiku"), prompt: big })),
    argv80k: brief(await runClaude({ args: [...json("haiku"), big] })),
  };
  out.stdinMarkerOk = out.stdin80k.result.includes(marker);
  console.log("transport", JSON.stringify(out, null, 1));
  return out;
};

groups.cancel = async () => {
  // Long generation, killed after 4 s. Look for orphan processes in the tree afterwards.
  const child = spawn("claude", json("sonnet"), { cwd: makeSandbox().dir, windowsHide: true });
  child.stdin.end("Write a 3000-word essay about the history of the CV.");
  child.stdout.resume();
  child.stderr.resume();
  await new Promise((r) => setTimeout(r, 4000));
  const listTree = () => execFileSync("powershell", ["-NoProfile", "-Command",
    `Get-CimInstance Win32_Process | Where-Object { $_.ParentProcessId -eq ${child.pid} -or $_.ProcessId -eq ${child.pid} } | Select-Object ProcessId,ParentProcessId,Name | ConvertTo-Json -Compress`]).toString();
  const treeBefore = listTree();
  const t0 = Date.now();
  const closed = new Promise((r) => child.on("close", (code, signal) => r({ code, signal, ms: Date.now() - t0 })));
  child.kill(); // plain kill first: does it reach the tree?
  const plainKill = await Promise.race([closed, new Promise((r) => setTimeout(() => r("no-close-within-3s"), 3000))]);
  if (plainKill === "no-close-within-3s") killTree(child.pid);
  await new Promise((r) => setTimeout(r, 1500));
  const out = { pid: child.pid, treeBefore, plainKill, treeAfter: listTree() || "(none)" };
  console.log("cancel", JSON.stringify(out, null, 1));
  return out;
};

for (const [name, fn] of Object.entries(groups)) {
  if (only && only !== name) continue;
  save(`c-${name}`, await fn());
}
