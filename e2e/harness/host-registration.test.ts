import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { E2E_NATIVE_HOST_NAME, NATIVE_HOST_NAME } from "@cv-snap/shared";
import { describe, expect, it } from "vitest";
import {
  hostEnvironment,
  hostManifest,
  launcherScript,
  registerHost,
  WINDOWS_REGISTRY_KEYS,
} from "./host-registration";

describe("host registration", () => {
  it("registers the e2e host name, never the real one", () => {
    const manifest = hostManifest("/tmp/host.sh", "mmchmbhcfcoeopinlclfbgaekeocdmnf");

    expect(manifest.name).toBe(E2E_NATIVE_HOST_NAME);
    expect(manifest.allowed_origins).toEqual([
      "chrome-extension://mmchmbhcfcoeopinlclfbgaekeocdmnf/",
    ]);
    for (const key of WINDOWS_REGISTRY_KEYS) {
      expect(key.endsWith(`\\${E2E_NATIVE_HOST_NAME}`)).toBe(true);
      expect(key.endsWith(`\\${NATIVE_HOST_NAME}`)).toBe(false);
    }
  });

  it("runs the host with the fake provider and app data inside the work directory", () => {
    const env = hostEnvironment("/work", "/fixtures");

    expect(env.CV_SNAP_FAKE_PROVIDER).toBe("/fixtures");
    for (const key of ["LOCALAPPDATA", "XDG_DATA_HOME", "HOME"] as const) {
      expect(env[key]).toBe(join("/work", "app-data"));
    }
  });

  it("writes a .cmd launcher on Windows that sets the environment and passes Chrome's arguments", () => {
    const script = launcherScript(
      "win32",
      { CV_SNAP_FAKE_PROVIDER: "C:\\a b\\fixtures" },
      "C:\\node\\node.exe",
      "C:\\repo\\host.mjs",
    );

    expect(script.split("\r\n")).toEqual([
      "@echo off",
      '"%SystemRoot%\\System32\\chcp.com" 65001 >nul',
      'set "CV_SNAP_FAKE_PROVIDER=C:\\a b\\fixtures"',
      '"C:\\node\\node.exe" "C:\\repo\\host.mjs" %*',
      "",
    ]);
  });

  it("writes a shell launcher elsewhere, quoting paths with spaces and quotes", () => {
    const script = launcherScript(
      "linux",
      { CV_SNAP_FAKE_PROVIDER: "/a b/it's" },
      "/usr/bin/node",
      "/repo/host.mjs",
    );

    expect(script.split("\n")).toEqual([
      "#!/bin/sh",
      "export CV_SNAP_FAKE_PROVIDER='/a b/it'\\''s'",
      "exec '/usr/bin/node' '/repo/host.mjs' \"$@\"",
      "",
    ]);
  });
});

const regDefault = (key: string): string | null => {
  try {
    const out = execFileSync("reg", ["query", key, "/ve"], { stdio: "pipe" }).toString("utf8");
    return /REG_SZ\s+(.+?)\s*$/m.exec(out)?.[1] ?? null;
  } catch {
    return null;
  }
};

/** A registration the test pretends was there before the harness ran. */
const BEFORE = String.raw`C:\before.json`;

describe.runIf(process.platform === "win32")("registerHost on Windows", () => {
  it("writes the e2e key and puts back what was there before", () => {
    const [key] = WINDOWS_REGISTRY_KEYS;
    const workDir = mkdtempSync(join(tmpdir(), "cvsnap-reg-"));
    execFileSync("reg", ["add", key, "/ve", "/t", "REG_SZ", "/d", BEFORE, "/f"]);
    try {
      const registration = registerHost({
        platform: "win32",
        workDir,
        userDataDir: join(workDir, "profile"),
        nodePath: process.execPath,
        hostScript: "host.mjs",
        fixturesDir: "fixtures",
        extensionId: "mmchmbhcfcoeopinlclfbgaekeocdmnf",
      });
      expect(regDefault(key)).toBe(join(workDir, `${E2E_NATIVE_HOST_NAME}.json`));

      registration.remove();
      registration.remove();

      expect(regDefault(key)).toBe(BEFORE);
    } finally {
      execFileSync("reg", ["delete", key, "/f"], { stdio: "pipe" });
      rmSync(workDir, { recursive: true, force: true });
    }
  });
});
