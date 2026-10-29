import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { allowedExtensionOrigins, DEV_EXTENSION_ID, originOf } from "@cv-snap/shared";
import { afterEach, describe, expect, it } from "vitest";
import type { RunProcessOptions, RunProcessResult } from "../lib/run-process.js";
import {
  buildManifest,
  buildWrapper,
  installHost,
  registryKeyFor,
  uninstallHost,
} from "./install.js";

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
      hostDir,
      mainScriptPath: "C:\\repo\\native-host\\dist\\main.js",
      nodePath: "C:\\Program Files\\nodejs\\node.exe",
      run: reg.run,
    });

    expect(readFileSync(result.wrapperPath, "utf8")).toContain(
      '"C:\\repo\\native-host\\dist\\main.js"',
    );
    const manifest = JSON.parse(readFileSync(result.manifestPath, "utf8")) as { path: string };
    expect(manifest.path).toBe(result.wrapperPath);
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
        hostDir: tempHostDir(),
        mainScriptPath: "main.js",
        nodePath: "node.exe",
        run: fakeReg({ add: 1 }).run,
      }),
    ).rejects.toThrow("reg add failed");
  });
});

describe("uninstallHost", () => {
  it("deletes the key and the host directory when installed", async () => {
    const hostDir = tempHostDir();
    await installHost({ hostDir, mainScriptPath: "m.js", nodePath: "n.exe", run: fakeReg().run });
    const reg = fakeReg();

    await uninstallHost({ hostDir, run: reg.run });

    expect(reg.calls.map((call) => call[1])).toEqual(["query", "delete"]);
    expect(existsSync(hostDir)).toBe(false);
  });

  it("succeeds without deleting anything when nothing is registered", async () => {
    const reg = fakeReg({ query: 1 });

    await uninstallHost({ hostDir: tempHostDir(), run: reg.run });

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

      await uninstallHost({ hostDir, hostName: TEST_HOST });

      expect(keyExists()).toBe(false);
      expect(existsSync(hostDir)).toBe(false);
    } finally {
      if (keyExists()) execFileSync("reg", ["delete", registryKeyFor(TEST_HOST), "/f"]);
    }
  });
});
