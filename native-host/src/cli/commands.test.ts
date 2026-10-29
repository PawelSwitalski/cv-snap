import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { PDFJS_RUNTIME_FILES } from "../install/runtime.js";
import type { RunProcessOptions, RunProcessResult } from "../lib/run-process.js";
import { HOST_VERSION } from "../version.js";
import { runCommand, type CommandDeps } from "./commands.js";
import { USAGE } from "./route.js";

const PDFJS_DIRS: readonly string[] = ["cmaps", "standard_fonts", "wasm"];
const dirs: string[] = [];
afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

/** Isolated app data, a source package to install from, a fake reg.exe and captured output. */
function harness(overrides: Partial<CommandDeps> = {}) {
  const root = mkdtempSync(join(tmpdir(), "cv snap cli "));
  dirs.push(root);
  const bundlePath = join(root, "pkg", "dist", "cv-snap-host.mjs");
  mkdirSync(join(bundlePath, ".."), { recursive: true });
  writeFileSync(bundlePath, "// bundle\n");
  const pdfjsRoot = join(root, "pkg", "node_modules", "pdfjs-dist");
  for (const file of PDFJS_RUNTIME_FILES) {
    const target = PDFJS_DIRS.includes(file) ? `${file}/x` : file;
    mkdirSync(join(pdfjsRoot, target, ".."), { recursive: true });
    writeFileSync(join(pdfjsRoot, target), file);
  }
  const out: string[] = [];
  const err: string[] = [];
  const regCalls: (readonly string[])[] = [];
  const run = (options: RunProcessOptions): Promise<RunProcessResult> => {
    regCalls.push(options.args);
    return Promise.resolve({
      exitCode: 0,
      stdout: "",
      stderr: "",
      isTimedOut: false,
      isAborted: false,
      spawnErrorCode: null,
    });
  };
  const deps: CommandDeps = {
    platform: "win32",
    env: { LOCALAPPDATA: join(root, "AppData") },
    bundlePath,
    resolvePdfjsRoot: () => pdfjsRoot,
    nodePath: "C:\\Program Files\\nodejs\\node.exe",
    print: (line) => out.push(line),
    printError: (line) => err.push(line),
    run,
    ...overrides,
  };
  const dataDir = join(root, "AppData", "cv-snap");
  return { deps, out, err, regCalls, dataDir, hostDir: join(dataDir, "host"), bundlePath };
}

describe("runCommand: information", () => {
  it("prints the version", async () => {
    const { deps, out } = harness();

    expect(await runCommand({ kind: "version" }, deps)).toBe(0);
    expect(out).toEqual([HOST_VERSION]);
  });

  it("prints help to stdout with exit code 0", async () => {
    const { deps, out, err } = harness();

    expect(await runCommand({ kind: "help" }, deps)).toBe(0);
    expect(out).toEqual([USAGE]);
    expect(err).toEqual([]);
  });

  it("prints the problem and usage to stderr with exit code 2", async () => {
    const { deps, out, err } = harness();

    expect(await runCommand({ kind: "usage", problem: "Unknown argument: x" }, deps)).toBe(2);
    expect(await runCommand({ kind: "usage", problem: null }, deps)).toBe(2);
    expect(out).toEqual([]);
    expect(err).toEqual(["Unknown argument: x", USAGE, USAGE]);
  });
});

describe("runCommand: install", () => {
  it("copies the runtime to the host directory and points the launcher there", async () => {
    const { deps, out, hostDir, regCalls } = harness();

    expect(await runCommand({ kind: "install" }, deps)).toBe(0);

    const entry = join(hostDir, "runtime", "cv-snap-host.mjs");
    expect(readFileSync(entry, "utf8")).toBe("// bundle\n");
    expect(readFileSync(join(hostDir, "cv-snap-host.cmd"), "utf8")).toContain(`"${entry}" %*`);
    expect(regCalls[0]?.[0]).toBe("add");
    expect(out[0]).toBe(`cv-snap native host ${HOST_VERSION} installed`);
    expect(out).toContain(`  runtime:   ${entry}`);
    expect(out.at(-1)).toBe("Reload the extension in chrome://extensions to connect.");
  });

  it("asks to close the side panel when the running host locks its files", async () => {
    const { deps, err, hostDir } = harness();
    await runCommand({ kind: "install" }, deps);
    const lockedDeps: CommandDeps = {
      ...deps,
      resolvePdfjsRoot: () => {
        throw Object.assign(new Error("EBUSY: resource busy"), { code: "EBUSY" });
      },
    };

    expect(await runCommand({ kind: "install" }, lockedDeps)).toBe(1);
    expect(err).toEqual([
      expect.stringContaining(
        "Close the cv-snap side panel (or Chrome), then run the command again",
      ),
    ]);
    expect(existsSync(join(hostDir, "runtime", "cv-snap-host.mjs"))).toBe(true);
  });

  it("rethrows other failures", async () => {
    const { deps } = harness({
      resolvePdfjsRoot: () => {
        throw new Error("Cannot find module 'pdfjs-dist/package.json'");
      },
    });

    await expect(runCommand({ kind: "install" }, deps)).rejects.toThrow("pdfjs-dist");
  });

  it("refuses outside Windows until macOS and Linux registration exists (bolt 015)", async () => {
    const { deps, err, dataDir } = harness({ platform: "linux" });

    expect(await runCommand({ kind: "install" }, deps)).toBe(1);
    expect(err).toEqual(["cv-snap host registration is only automated on Windows for now."]);
    expect(existsSync(dataDir)).toBe(false);
  });
});

describe("runCommand: uninstall", () => {
  async function installedWithLogs() {
    const h = harness();
    await runCommand({ kind: "install" }, h.deps);
    mkdirSync(join(h.dataDir, "logs"), { recursive: true });
    writeFileSync(join(h.dataDir, "logs", "host.log"), "{}\n");
    h.out.length = 0;
    return h;
  }

  it("removes runtime, launcher, manifest and registration but keeps the logs", async () => {
    const { deps, out, hostDir, dataDir, regCalls } = await installedWithLogs();

    expect(await runCommand({ kind: "uninstall", purge: false }, deps)).toBe(0);

    expect(existsSync(hostDir)).toBe(false);
    expect(existsSync(join(dataDir, "logs", "host.log"))).toBe(true);
    expect(regCalls.map((args) => args[0])).toEqual(["add", "query", "delete"]);
    expect(out.at(-1)).toContain("kept");
  });

  it("deletes the logs too with --purge", async () => {
    const { deps, out, dataDir } = await installedWithLogs();

    expect(await runCommand({ kind: "uninstall", purge: true }, deps)).toBe(0);

    expect(existsSync(dataDir)).toBe(false);
    expect(out.at(-1)).toBe(`  data:      ${dataDir} (deleted, including logs)`);
  });
});
