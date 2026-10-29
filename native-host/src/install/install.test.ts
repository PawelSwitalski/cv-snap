import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, posix } from "node:path";
import { allowedExtensionOrigins, DEV_EXTENSION_ID, originOf } from "@cv-snap/shared";
import { afterEach, describe, expect, it } from "vitest";
import type { RunProcessOptions, RunProcessResult } from "../lib/run-process.js";
import {
  buildManifest,
  buildShellLauncher,
  buildWrapper,
  installHost,
  manifestPathFor,
  parseLauncher,
  queryRegisteredManifest,
  registryKeyFor,
  uninstallHost,
} from "./install.js";

const WINDOWS = { platform: "win32", manifestDir: null } as const;
const dirs: string[] = [];
/** Temp directory whose name has spaces and Polish characters (story 003 edge case). */
const tempHostDir = () => {
  const dir = mkdtempSync(join(tmpdir(), "cv snap Zażółć gęślą "));
  dirs.push(dir);
  return join(dir, "host");
};
afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function fakeReg(exitCodes: Partial<Record<"add" | "query" | "delete", number>> = {}) {
  const calls: string[][] = [];
  const run = (options: RunProcessOptions): Promise<RunProcessResult> => {
    calls.push([options.command, ...options.args]);
    const verb = options.args[0] as "add" | "query" | "delete";
    return Promise.resolve({
      exitCode: exitCodes[verb] ?? 0,
      stdout: "",
      stderr: "",
      isTimedOut: false,
      isAborted: false,
      spawnErrorCode: null,
    });
  };
  return { run, calls };
}

describe("buildWrapper", () => {
  it("switches cmd to UTF-8 and quotes both paths", () => {
    const wrapper = buildWrapper("C:\\Program Files\\nodejs\\node.exe", "C:\\Użytkownik\\main.js");

    expect(wrapper.split("\r\n")).toEqual([
      "@echo off",
      '"%SystemRoot%\\System32\\chcp.com" 65001 >nul',
      '"C:\\Program Files\\nodejs\\node.exe" "C:\\Użytkownik\\main.js" %*',
      "",
    ]);
  });
});

describe("buildShellLauncher (macOS, Linux)", () => {
  it("execs Node with the runtime and passes Chrome's arguments through", () => {
    expect(buildShellLauncher("/usr/local/bin/node", "/home/jan/rt/cv-snap-host.mjs")).toBe(
      `#!/bin/sh\nexec '/usr/local/bin/node' '/home/jan/rt/cv-snap-host.mjs' "$@"\n`,
    );
  });

  it("quotes spaces, dollars and single quotes safely", () => {
    const launcher = buildShellLauncher("/opt/my node/bin/node", "/Users/O'Brien/$HOME/x.mjs");

    expect(launcher).toContain(
      String.raw`exec '/opt/my node/bin/node' '/Users/O'\''Brien/$HOME/x.mjs'`,
    );
  });
});

describe("parseLauncher", () => {
  it.each([
    [
      "Windows",
      buildWrapper,
      "C:\\Program Files\\node.exe",
      "C:\\Użytkownik\\rt\\cv-snap-host.mjs",
    ],
    ["shell", buildShellLauncher, "/opt/my node/node", "/Users/O'Brien/rt/cv-snap-host.mjs"],
  ])("reads back what a %s launcher starts", (_kind, build, nodePath, mainScriptPath) => {
    expect(parseLauncher(build(nodePath, mainScriptPath))).toEqual({ nodePath, mainScriptPath });
  });

  it("returns null for anything else", () => {
    expect(parseLauncher("")).toBeNull();
    expect(parseLauncher("#!/bin/sh\nnode main.js\n")).toBeNull();
  });
});

describe("buildManifest", () => {
  it("allows exactly the given cv-snap origins (dev and store builds)", () => {
    const store = originOf("abcdefghijklmnopabcdefghijklmnop");
    const manifest = buildManifest("com.cvsnap.host", "C:\\host\\cv-snap-host.cmd", [
      originOf(DEV_EXTENSION_ID),
      store,
    ]);

    expect(manifest).toMatchObject({ name: "com.cvsnap.host", type: "stdio" });
    expect(manifest.allowed_origins).toEqual([originOf(DEV_EXTENSION_ID), store]);
  });

  it("defaults to the allowed origins from shared", () => {
    const manifest = buildManifest(
      "com.cvsnap.host",
      "C:\\host\\cv-snap-host.cmd",
      allowedExtensionOrigins(),
    );

    expect(manifest.allowed_origins).toContain(originOf(DEV_EXTENSION_ID));
    for (const origin of manifest.allowed_origins) {
      expect(origin).toMatch(/^chrome-extension:\/\/[a-p]{32}\/$/);
    }
  });
});

describe("installHost", () => {
  it("writes the wrapper and manifest and registers the manifest path under HKCU", async () => {
    const hostDir = tempHostDir();
    const reg = fakeReg();

    const result = await installHost({
      ...WINDOWS,
      hostDir,
      mainScriptPath: "C:\\repo\\native-host\\dist\\main.js",
      nodePath: "C:\\Program Files\\nodejs\\node.exe",
      run: reg.run,
    });

    expect(readFileSync(result.launcherPath, "utf8")).toContain(
      '"C:\\repo\\native-host\\dist\\main.js"',
    );
    const manifest = JSON.parse(readFileSync(result.manifestPath, "utf8")) as { path: string };
    expect(manifest.path).toBe(result.launcherPath);
    expect(reg.calls).toEqual([
      [
        "reg",
        "add",
        "HKCU\\Software\\Google\\Chrome\\NativeMessagingHosts\\com.cvsnap.host",
        "/ve",
        "/t",
        "REG_SZ",
        "/d",
        result.manifestPath,
        "/f",
      ],
    ]);
  });

  it("fails loudly when reg.exe fails", async () => {
    await expect(
      installHost({
        ...WINDOWS,
        hostDir: tempHostDir(),
        mainScriptPath: "main.js",
        nodePath: "node.exe",
        run: fakeReg({ add: 1 }).run,
      }),
    ).rejects.toThrow("reg add failed");
  });
});

describe.each(["darwin", "linux"] as const)("installHost on %s", (platform) => {
  function posixSetup() {
    const home = tempHostDir().replace(/host$/, "home");
    return {
      platform,
      hostDir: join(home, "data", "cv-snap", "host"),
      manifestDir: join(home, "chrome", "NativeMessagingHosts"),
    };
  }

  it("writes the manifest into Chrome's directory and an executable launcher, no registry", async () => {
    const options = posixSetup();
    const reg = fakeReg();

    const result = await installHost({
      ...options,
      mainScriptPath: "/home/jan/rt/cv-snap-host.mjs",
      nodePath: "/home/jan/.nvm/versions/node/v24.1.0/bin/node",
      run: reg.run,
    });

    expect(result.manifestPath).toBe(posix.join(options.manifestDir, "com.cvsnap.host.json"));
    expect(result.registryKey).toBeNull();
    expect(reg.calls).toEqual([]);
    const manifest = JSON.parse(readFileSync(result.manifestPath, "utf8")) as { path: string };
    expect(manifest.path).toBe(posix.join(options.hostDir, "cv-snap-host"));
    expect(parseLauncher(readFileSync(result.launcherPath, "utf8"))).toEqual({
      nodePath: "/home/jan/.nvm/versions/node/v24.1.0/bin/node",
      mainScriptPath: "/home/jan/rt/cv-snap-host.mjs",
    });
    if (process.platform !== "win32") {
      expect(statSync(result.launcherPath).mode & 0o777).toBe(0o755);
    }
  });

  it("uninstalls the manifest and the host directory, and is fine when nothing is there", async () => {
    const options = posixSetup();
    await installHost({ ...options, mainScriptPath: "m.mjs", nodePath: "node" });

    const { registration } = await uninstallHost(options);
    await uninstallHost(options);

    expect(registration).toBe(manifestPathFor(options));
    expect(existsSync(registration)).toBe(false);
    expect(existsSync(options.hostDir)).toBe(false);
    expect(existsSync(options.manifestDir)).toBe(true); // Chrome's directory stays
  });
});

describe.runIf(process.platform !== "win32")("shell launcher (as Chrome starts it)", () => {
  it("runs the runtime with the install-time Node and Chrome's arguments", () => {
    const dir = tempHostDir().replace(/host$/, "it's here");
    const script = join(dir, "echo args.mjs");
    const launcher = join(dir, "cv-snap-host");
    execFileSync("mkdir", ["-p", dir]);
    writeFileSync(script, "process.stdout.write(JSON.stringify(process.argv.slice(2)));\n");
    writeFileSync(launcher, buildShellLauncher(process.execPath, script), { mode: 0o755 });

    const output = execFileSync(launcher, ["chrome-extension://abc/", "--x"], {
      encoding: "utf8",
      env: { PATH: "" },
    });

    expect(JSON.parse(output)).toEqual(["chrome-extension://abc/", "--x"]);
  });
});

describe("queryRegisteredManifest", () => {
  const regOutput = (exitCode: number, stdout: string) => () =>
    Promise.resolve({
      exitCode,
      stdout,
      stderr: "",
      isTimedOut: false,
      isAborted: false,
      spawnErrorCode: null,
    });

  it("reads the default value of the host key", async () => {
    const manifest = String.raw`C:\Users\jan\AppData\Local\cv-snap\host\com.cvsnap.host.json`;
    const key = String.raw`HKEY_CURRENT_USER\Software\Google\Chrome\NativeMessagingHosts\com.cvsnap.host`;
    const stdout = `\r\n${key}\r\n    (Default)    REG_SZ    ${manifest}\r\n\r\n`;

    expect(await queryRegisteredManifest(undefined, regOutput(0, stdout))).toBe(manifest);
  });

  it("returns null when the key is missing", async () => {
    expect(await queryRegisteredManifest(undefined, regOutput(1, ""))).toBeNull();
  });
});

describe("uninstallHost", () => {
  it("deletes the key and the host directory when installed", async () => {
    const hostDir = tempHostDir();
    await installHost({
      ...WINDOWS,
      hostDir,
      mainScriptPath: "m.js",
      nodePath: "n.exe",
      run: fakeReg().run,
    });
    const reg = fakeReg();

    await uninstallHost({ ...WINDOWS, hostDir, run: reg.run });

    expect(reg.calls.map((call) => call[1])).toEqual(["query", "delete"]);
    expect(existsSync(hostDir)).toBe(false);
  });

  it("succeeds without deleting anything when nothing is registered", async () => {
    const reg = fakeReg({ query: 1 });

    await uninstallHost({ ...WINDOWS, hostDir: tempHostDir(), run: reg.run });

    expect(reg.calls.map((call) => call[1])).toEqual(["query"]);
  });
});

/**
 * Real HKCU round trip under a separate test key, never the real `com.cvsnap.host`.
 * The key is removed in `finally`, so it is cleaned up even when an assertion fails.
 */
describe.runIf(process.platform === "win32")("registry round trip (HKCU, test key)", () => {
  const TEST_HOST = "com.cvsnap.host.test";
  const keyExists = () => {
    try {
      execFileSync("reg", ["query", registryKeyFor(TEST_HOST)], { stdio: "ignore" });
      return true;
    } catch {
      return false;
    }
  };
  /** Reads the default value exactly (UTF-8), which reg.exe's console output can't do. */
  const readDefaultValue = () =>
    execFileSync(
      "powershell",
      [
        "-NoProfile",
        "-Command",
        "[Console]::OutputEncoding=[Text.Encoding]::UTF8;" +
          `(Get-Item -LiteralPath 'HKCU:\\Software\\Google\\Chrome\\NativeMessagingHosts\\${TEST_HOST}').GetValue('')`,
      ],
      { encoding: "utf8" },
    ).trim();

  it("installs idempotently with a non-ASCII path, then uninstalls completely", async () => {
    expect(keyExists()).toBe(false); // never overwrite something we didn't create
    const hostDir = tempHostDir();
    const options = {
      ...WINDOWS,
      hostDir,
      hostName: TEST_HOST,
      mainScriptPath: "m.js",
      nodePath: process.execPath,
    };
    try {
      const first = await installHost(options);
      const second = await installHost(options);

      expect(second).toEqual(first);
      expect(readDefaultValue()).toBe(first.manifestPath);
      expect(first.manifestPath).toContain("Zażółć");

      await uninstallHost({ ...WINDOWS, hostDir, hostName: TEST_HOST });

      expect(keyExists()).toBe(false);
      expect(existsSync(hostDir)).toBe(false);
    } finally {
      if (keyExists()) execFileSync("reg", ["delete", registryKeyFor(TEST_HOST), "/f"]);
    }
  });
});
