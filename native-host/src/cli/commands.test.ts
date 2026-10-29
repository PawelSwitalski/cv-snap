import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { HealthReport } from "@cv-snap/shared";
import { afterEach, describe, expect, it } from "vitest";
import type { HostPlatform } from "../install/platform.js";
import type { RunProcessOptions, RunProcessResult } from "../lib/run-process.js";
import { HOST_VERSION } from "../version.js";
import { runCommand, type CommandDeps } from "./commands.js";
import { USAGE } from "./route.js";

const HEALTHY: HealthReport = {
  hostVersion: HOST_VERSION,
  claudeFound: true,
  claudeVersion: "2.1.302",
  isAuthenticated: true,
  isVersionSupported: true,
};
const dirs: string[] = [];
afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

/** An isolated home, a package `dist/` to install from, a fake reg.exe and captured output. */
function harness(platform: HostPlatform = "win32", overrides: Partial<CommandDeps> = {}) {
  const home = mkdtempSync(join(tmpdir(), "cv snap cli "));
  dirs.push(home);
  const sourceDir = join(home, "npx-cache", "dist");
  mkdirSync(join(sourceDir, "vendor"), { recursive: true });
  writeFileSync(join(sourceDir, "cv-snap-host.mjs"), "// bundle\n");
  writeFileSync(join(sourceDir, "vendor", "pdf.mjs"), "pdf.js");
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
  const env = platform === "win32" ? { LOCALAPPDATA: join(home, "AppData", "Local") } : {};
  const nodePath = join(home, "node", "node.exe");
  mkdirSync(join(nodePath, ".."), { recursive: true });
  writeFileSync(nodePath, "");
  const deps: CommandDeps = {
    context: { platform, env, home },
    sourceDir,
    nodePath,
    health: () => Promise.resolve(HEALTHY),
    nodeVersion: "26.12.1",
    print: (line) => out.push(line),
    printError: (line) => err.push(line),
    run,
    ...overrides,
  };
  const dataDir =
    platform === "win32"
      ? join(home, "AppData", "Local", "cv-snap")
      : platform === "darwin"
        ? join(home, "Library", "Application Support", "cv-snap")
        : join(home, ".local", "share", "cv-snap");
  return { deps, out, err, regCalls, home, dataDir, hostDir: join(dataDir, "host") };
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

  it("refuses an unsupported OS", async () => {
    const { deps, err } = harness("win32", { context: null });

    expect(await runCommand({ kind: "install" }, deps)).toBe(1);
    expect(err).toEqual(["cv-snap supports Windows, macOS and Linux only."]);
  });
});

describe("runCommand: install", () => {
  it("copies the runtime to the host directory and points the launcher there (Windows)", async () => {
    const { deps, out, hostDir, regCalls } = harness();

    expect(await runCommand({ kind: "install" }, deps)).toBe(0);

    const entry = join(hostDir, "runtime", "cv-snap-host.mjs");
    expect(readFileSync(entry, "utf8")).toBe("// bundle\n");
    expect(existsSync(join(hostDir, "runtime", "vendor", "pdf.mjs"))).toBe(true);
    expect(readFileSync(join(hostDir, "cv-snap-host.cmd"), "utf8")).toContain(`"${entry}" %*`);
    expect(regCalls[0]?.[0]).toBe("add");
    expect(out[0]).toBe(`cv-snap native host ${HOST_VERSION} installed`);
    expect(out.at(-1)).toBe("Reload the extension in chrome://extensions to connect.");
  });

  it("asks to close the side panel when the running host locks its files", async () => {
    const { deps, err, hostDir } = harness("win32", {
      run: () => {
        throw Object.assign(new Error("EBUSY: resource busy"), { code: "EBUSY" });
      },
    });

    expect(await runCommand({ kind: "install" }, deps)).toBe(1);
    expect(err).toEqual([
      expect.stringContaining(
        "Close the cv-snap side panel (or Chrome), then run the command again",
      ),
    ]);
    expect(existsSync(join(hostDir, "runtime", "cv-snap-host.mjs"))).toBe(true);
  });

  it("rethrows other failures", async () => {
    const { deps } = harness("win32", {
      run: () => Promise.reject(new Error("reg.exe is missing")),
    });

    await expect(runCommand({ kind: "install" }, deps)).rejects.toThrow("reg.exe is missing");
  });
});

describe("runCommand: uninstall", () => {
  async function installedWithLogs(platform: HostPlatform = "win32") {
    const h = harness(platform);
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
    expect(out.at(-1)).toContain("(deleted, including logs)");
  });
});

describe("runCommand: macOS and Linux", () => {
  it.each([
    ["linux", [".config", "google-chrome", "NativeMessagingHosts"]],
    ["darwin", ["Library", "Application Support", "Google", "Chrome", "NativeMessagingHosts"]],
  ] as const)(
    "installs on %s into Chrome's manifest directory, no registry",
    async (platform, dir) => {
      const { deps, home, hostDir, regCalls, out } = harness(platform);

      expect(await runCommand({ kind: "install" }, deps)).toBe(0);

      expect(existsSync(join(home, ...dir, "com.cvsnap.host.json"))).toBe(true);
      expect(existsSync(join(hostDir, "cv-snap-host"))).toBe(true);
      expect(existsSync(join(hostDir, "runtime", "cv-snap-host.mjs"))).toBe(true);
      expect(regCalls).toEqual([]);
      expect(out.some((line) => line.startsWith("  registry:"))).toBe(false);

      expect(await runCommand({ kind: "uninstall", purge: false }, deps)).toBe(0);
      expect(existsSync(join(home, ...dir, "com.cvsnap.host.json"))).toBe(false);
      expect(existsSync(hostDir)).toBe(false);
    },
  );
});

describe("runCommand: doctor", () => {
  it("passes right after install and exits 0", async () => {
    const { deps, out } = harness("linux");
    await runCommand({ kind: "install" }, deps);
    out.length = 0;

    expect(await runCommand({ kind: "doctor" }, deps)).toBe(0);
    expect(out[0]).toBe(`cv-snap-host ${HOST_VERSION} doctor`);
    expect(out.filter((line) => line.startsWith("✓"))).toHaveLength(7);
    expect(out.at(-1)).toBe("cv-snap is ready.");
  });

  it("lists the problems and exits 1 when nothing is installed", async () => {
    const { deps, out } = harness("linux");

    expect(await runCommand({ kind: "doctor" }, deps)).toBe(1);
    expect(out.some((line) => line.startsWith("✗ Registration"))).toBe(true);
    expect(out.at(-1)).toMatch(/problem\(s\) to fix\.$/);
  });
});
