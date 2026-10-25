// Throwaway spike runner for bolt 001-native-host. NOT product code.
// Spawns `claude` without a shell (args as array), feeds the prompt on stdin,
// enforces a timeout, and returns a redacted capture of the run.
import { spawn, execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir, homedir, userInfo } from "node:os";
import { join, dirname } from "node:path";
import { randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";

export const RESULTS_DIR = join(dirname(fileURLToPath(import.meta.url)), "results");
mkdirSync(RESULTS_DIR, { recursive: true });

/** Lockdown chosen from probe A: no built-in tools, no MCP (incl. claude.ai connectors), no settings/hooks. */
export const LOCKDOWN = ["--tools", "", "--strict-mcp-config", "--setting-sources", "",
  "--no-session-persistence"];

/**
 * Fresh empty working dir with a canary file, so file-tool side effects are detectable.
 * The token is random per sandbox: a fixed "random-looking" hex string was guessed by the
 * model when it hallucinated tool results, giving a false positive.
 */
export function makeSandbox() {
  const dir = mkdtempSync(join(tmpdir(), "cvsnap-spike-"));
  const canaryToken = `CANARY-${randomBytes(12).toString("hex")}`;
  writeFileSync(join(dir, "canary.txt"), `secret token: ${canaryToken}\n`);
  return { dir, canaryToken };
}

/** Strip personal data (emails, home path, org id) before results are written to disk. */
export function redact(text) {
  const home = homedir();
  return text
    .replaceAll(home, "~")
    .replaceAll(home.replaceAll("\\", "\\\\"), "~")
    .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, "<email>")
    .replace(/("orgId"\s*:\s*")[^"]+/g, "$1<org>")
    // Username also appears double-escaped and in ~/.claude/projects slugs.
    .replaceAll(userInfo().username, "<user>");
}

/** Kill the whole process tree (Windows needs taskkill /T; child.kill only hits the root). */
export function killTree(pid) {
  try {
    execFileSync("taskkill", ["/PID", String(pid), "/T", "/F"], { stdio: "ignore" });
  } catch {
    // already gone
  }
}

/**
 * @param {object} o
 * @param {string[]} o.args
 * @param {string} [o.prompt]   written to stdin
 * @param {string} [o.cwd]
 * @param {Record<string,string|undefined>} [o.env] overrides; undefined value deletes the var
 * @param {number} [o.timeoutMs]
 */
export function runClaude({ args, prompt, cwd, env = {}, timeoutMs = 180_000 }) {
  const mergedEnv = { ...process.env };
  for (const [k, v] of Object.entries(env)) {
    if (v === undefined) delete mergedEnv[k];
    else mergedEnv[k] = v;
  }
  const started = Date.now();
  return new Promise((resolve) => {
    let child;
    try {
      child = spawn("claude", args, {
        cwd: cwd ?? makeSandbox().dir,
        env: mergedEnv,
        windowsHide: true,
        stdio: ["pipe", "pipe", "pipe"],
      });
    } catch (err) {
      // e.g. ENAMETOOLONG for oversized argv on Windows: thrown synchronously, not emitted.
      resolve({ args: args.map((a) => a.slice(0, 80)), spawnError: String(err), durationMs: Date.now() - started });
      return;
    }
    let stdout = "";
    let stderr = "";
    let isTimedOut = false;
    child.stdout.on("data", (d) => (stdout += d));
    child.stderr.on("data", (d) => (stderr += d));
    const timer = setTimeout(() => {
      isTimedOut = true;
      killTree(child.pid);
    }, timeoutMs);
    child.on("error", (err) => {
      clearTimeout(timer);
      resolve({ args, spawnError: String(err), durationMs: Date.now() - started });
    });
    child.on("close", (exitCode, signal) => {
      clearTimeout(timer);
      resolve({
        args,
        exitCode,
        signal,
        isTimedOut,
        durationMs: Date.now() - started,
        stdout: redact(stdout),
        stderr: redact(stderr),
      });
    });
    child.stdin.on("error", () => {});
    child.stdin.end(prompt ?? "");
  });
}

/** Parse a stream-json transcript into events (ignores non-JSON lines). */
export function parseStream(stdout) {
  return stdout
    .split(/\r?\n/)
    .filter(Boolean)
    .map((l) => {
      try {
        return JSON.parse(l);
      } catch {
        return { _raw: l };
      }
    });
}

export function toolUses(events) {
  return events
    .filter((e) => e.type === "assistant")
    .flatMap((e) => e.message?.content ?? [])
    .filter((c) => c.type === "tool_use")
    .map((c) => c.name);
}

export function save(name, data) {
  const file = join(RESULTS_DIR, `${name}.json`);
  writeFileSync(file, JSON.stringify(data, null, 2));
  return file;
}
