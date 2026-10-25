import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { installHost } from "../src/install/install.js";
import { frame, parseFrames } from "./frames.js";

/**
 * End-to-end: the built host (`dist/main.js`, built by global-setup) as a real child process.
 * The environment hides Claude Code (empty PATH, temp app-data dirs), so the real `claude` CLI is
 * never run, and logs go to a temp directory.
 */
const MAIN = fileURLToPath(new URL("../dist/main.js", import.meta.url));
const CHROME_ORIGIN_ARG = "chrome-extension://mmchmbhcfcoeopinlclfbgaekeocdmnf/";

const dirs: string[] = [];
const tempDir = (prefix: string) => {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  dirs.push(dir);
  return dir;
};
afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function isolatedEnv(home: string): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (!/^(path|localappdata|appdata|userprofile|home)$/i.test(key)) env[key] = value;
  }
  return { ...env, PATH: "", LOCALAPPDATA: home, APPDATA: home, USERPROFILE: home, HOME: home };
}

interface Exchange {
  exitCode: number | null;
  stdout: Buffer;
  stderr: string;
}

/** Sends frames, waits for `expectReplies` frames, closes stdin, waits for exit. */
function exchange(
  command: string,
  args: string[],
  env: NodeJS.ProcessEnv,
  input: Buffer[],
  expectReplies: number,
  spawnOptions: { windowsVerbatimArguments?: boolean } = {},
): Promise<Exchange> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { env, windowsHide: true, ...spawnOptions });
    const out: Buffer[] = [];
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error(`host did not finish; stderr: ${stderr}`));
    }, 15_000);
    child.stdout.on("data", (chunk: Buffer) => {
      out.push(chunk);
      try {
        if (parseFrames(Buffer.concat(out)).length >= expectReplies) child.stdin.end();
      } catch {
        // incomplete frame so far
      }
    });
    child.stderr.on("data", (chunk: Buffer) => (stderr += chunk.toString("utf8")));
    child.on("error", reject);
    child.on("close", (exitCode) => {
      clearTimeout(timer);
      resolve({ exitCode, stdout: Buffer.concat(out), stderr });
    });
    for (const bytes of input) child.stdin.write(bytes);
    if (expectReplies === 0) child.stdin.end();
  });
}

describe("built native host (end to end)", () => {
  it("answers over real stdio with nothing but protocol frames on stdout, then exits cleanly", async () => {
    const home = tempDir("cvsnap-e2e-");
    const garbage = Buffer.from("this is not a frame");

    const result = await exchange(
      process.execPath,
      [MAIN, CHROME_ORIGIN_ARG],
      isolatedEnv(home),
      [
        frame({ type: "health", requestId: "h1" }),
        frame({ type: "tailor", requestId: "t1" }),
        frame({ type: "createProfile", requestId: "c1", model: "claude-haiku-5-5", cvText: "x" }),
        frame({ type: "cancel", requestId: "nothing-running" }),
        garbage,
      ],
      4,
    );

    const frames = parseFrames(result.stdout); // throws on any stray byte
    const byId = new Map(frames.map((f) => [f.requestId, f]));
    expect(result.exitCode).toBe(0);
    expect(byId.get("h1")).toMatchObject({
      response: { ok: true, data: { claudeFound: false, hostVersion: "0.1.0" } },
    });
    expect(byId.get("t1")).toMatchObject({
      response: { ok: false, error: { code: "INVALID_MESSAGE" } },
    });
    expect(byId.get("c1")).toMatchObject({
      response: { ok: false, error: { code: "INVALID_MESSAGE" } },
    });
    expect(byId.get("unknown")).toMatchObject({
      response: { ok: false, error: { code: "MESSAGE_TOO_LARGE" } },
    });
    expect(frames).toHaveLength(4);
  });

  it("logs to stderr and the rotating file in app-data, without request content", async () => {
    const home = tempDir("cvsnap-e2e-");

    const result = await exchange(
      process.execPath,
      [MAIN],
      isolatedEnv(home),
      [frame({ type: "createProfile", requestId: "c1", model: "nope", cvText: "Jan Testowy" })],
      1,
    );

    const logFile = join(home, "cv-snap", "logs", "host.log");
    expect(existsSync(logFile)).toBe(true);
    const fileLog = readFileSync(logFile, "utf8");
    expect(fileLog).toContain('"message":"host started"');
    expect(result.stderr).toContain('"message":"host stopped"');
    expect(fileLog + result.stderr).not.toContain("Jan Testowy");
  });

  it("exits cleanly when the extension disconnects without sending anything", async () => {
    const result = await exchange(
      process.execPath,
      [MAIN],
      isolatedEnv(tempDir("cvsnap-e2e-")),
      [],
      0,
    );

    expect(result.exitCode).toBe(0);
    expect(result.stdout.length).toBe(0);
  });
});

describe.runIf(process.platform === "win32")(
  "installed .cmd wrapper (as Chrome launches it)",
  () => {
    it("starts the host from a path with spaces and Polish characters", async () => {
      const root = tempDir("cv snap Zażółć gęślą ");
      // Main script inside the non-ASCII path too, so the wrapper's UTF-8 handling is exercised.
      const stub = join(root, "skrypt hosta.mjs");
      writeFileSync(stub, `await import(${JSON.stringify(pathToFileURL(MAIN).href)});\n`, "utf8");
      const noRegistry = () =>
        Promise.resolve({
          exitCode: 0,
          stdout: "",
          stderr: "",
          isTimedOut: false,
          isAborted: false,
          spawnErrorCode: null,
        });
      const { wrapperPath } = await installHost({
        hostDir: join(root, "host"),
        mainScriptPath: stub,
        nodePath: process.execPath,
        run: noRegistry,
      });

      // Chrome runs: cmd.exe /d /s /c ""<wrapper>" <origin>" with stdio on pipes.
      // Absolute path: the isolated environment has an empty PATH.
      const cmd = join(process.env.SystemRoot ?? "C:\\Windows", "System32", "cmd.exe");
      const result = await exchange(
        cmd,
        ["/d", "/s", "/c", `""${wrapperPath}" ${CHROME_ORIGIN_ARG}"`],
        isolatedEnv(tempDir("cvsnap-e2e-")),
        [frame({ type: "health", requestId: "h1" })],
        1,
        { windowsVerbatimArguments: true },
      );

      const frames = parseFrames(result.stdout); // chcp output must not leak into stdout
      expect(frames).toHaveLength(1);
      expect(frames).toMatchObject([{ requestId: "h1", response: { ok: true } }]);
      expect(result.exitCode).toBe(0);
    });
  },
);
