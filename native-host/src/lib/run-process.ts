import { execFile, spawn, type ChildProcess } from "node:child_process";

export interface RunProcessOptions {
  command: string;
  args: readonly string[];
  timeoutMs: number;
  signal?: AbortSignal;
  /** Written to stdin, then stdin is closed. Large inputs must go here, never on argv (spike 001). */
  stdin?: string;
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  /** Output beyond this is dropped (protects memory if a child misbehaves). */
  maxOutputBytes?: number;
}

export interface RunProcessResult {
  exitCode: number | null;
  stdout: string;
  stderr: string;
  isTimedOut: boolean;
  isAborted: boolean;
  /** Set when the process could not be started, e.g. `ENOENT` (not installed). */
  spawnErrorCode: string | null;
}

const DEFAULT_MAX_OUTPUT_BYTES = 4 * 1024 * 1024;
/** Cancel must stop the child within 2 s (FR-16); force-kill the tree if it hasn't exited by then. */
const FORCE_KILL_AFTER_MS = 1500;

export type ProcessRunner = (options: RunProcessOptions) => Promise<RunProcessResult>;

/** Runs a program without a shell (arguments as an array), with timeout, abort and output caps. */
export const runProcess: ProcessRunner = (options) => {
  const maxOutputBytes = options.maxOutputBytes ?? DEFAULT_MAX_OUTPUT_BYTES;
  return new Promise((resolve) => {
    const finish = (partial: Partial<RunProcessResult>) => {
      resolve({
        exitCode: null,
        stdout: "",
        stderr: "",
        isTimedOut: false,
        isAborted: false,
        spawnErrorCode: null,
        ...partial,
      });
    };
    if (options.signal?.aborted) {
      finish({ isAborted: true });
      return;
    }

    let child: ChildProcess;
    try {
      child = spawn(options.command, options.args, {
        cwd: options.cwd,
        env: options.env ?? process.env,
        windowsHide: true,
        stdio: ["pipe", "pipe", "pipe"],
      });
    } catch (error) {
      // Some failures (e.g. ENAMETOOLONG) are thrown synchronously instead of emitted.
      finish({ spawnErrorCode: errorCode(error) });
      return;
    }

    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];
    let outputBytes = 0;
    const collect = (target: Buffer[]) => (chunk: Buffer) => {
      if (outputBytes >= maxOutputBytes) return;
      outputBytes += chunk.length;
      target.push(chunk);
    };
    child.stdout?.on("data", collect(stdout));
    child.stderr?.on("data", collect(stderr));

    let isTimedOut = false;
    let isAborted = false;
    let forceKillTimer: NodeJS.Timeout | undefined;
    const stop = () => {
      child.kill();
      forceKillTimer = setTimeout(() => {
        killTree(child.pid);
      }, FORCE_KILL_AFTER_MS);
    };
    const timer = setTimeout(() => {
      isTimedOut = true;
      stop();
    }, options.timeoutMs);
    const onAbort = () => {
      isAborted = true;
      stop();
    };
    options.signal?.addEventListener("abort", onAbort, { once: true });

    let spawnErrorCode: string | null = null;
    child.on("error", (error) => {
      spawnErrorCode = errorCode(error);
    });
    child.on("close", (exitCode) => {
      clearTimeout(timer);
      clearTimeout(forceKillTimer);
      options.signal?.removeEventListener("abort", onAbort);
      finish({
        exitCode,
        stdout: Buffer.concat(stdout).toString("utf8"),
        stderr: Buffer.concat(stderr).toString("utf8"),
        isTimedOut,
        isAborted,
        spawnErrorCode,
      });
    });

    child.stdin?.on("error", () => {
      // The child may exit before reading stdin (EPIPE); its exit code tells the story.
    });
    child.stdin?.end(options.stdin ?? "");
  });
};

function errorCode(error: unknown): string {
  return error instanceof Error && "code" in error && typeof error.code === "string"
    ? error.code
    : "UNKNOWN";
}

function killTree(pid: number | undefined): void {
  if (pid === undefined) return;
  if (process.platform === "win32") {
    execFile("taskkill", ["/PID", String(pid), "/T", "/F"], { windowsHide: true }, () => {
      // Already gone is fine.
    });
  } else {
    try {
      process.kill(pid, "SIGKILL");
    } catch {
      // Already gone.
    }
  }
}
