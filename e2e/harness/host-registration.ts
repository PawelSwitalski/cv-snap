import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { E2E_NATIVE_HOST_NAME } from "@cv-snap/shared";

/**
 * Registers the built host for one test browser (story 002-e2e-harness), under the e2e build's own
 * host name, so a real `com.cvsnap.host` install is never replaced or removed.
 *
 * - Linux and macOS: Chromium also reads `<user-data-dir>/NativeMessagingHosts/`, so the manifest
 *   lives inside the temporary test profile and disappears with it.
 * - Windows: Chromium reads only the registry. The e2e key is written and deleted by the harness;
 *   a key it finds already there is put back afterwards.
 */

export interface HostRegistrationOptions {
  platform: NodeJS.Platform;
  /** Temporary directory for the launcher, the manifest and the host's app data (logs). */
  workDir: string;
  /** The test browser's user-data dir (Linux and macOS registration). */
  userDataDir: string;
  nodePath: string;
  /** `native-host/dist/cv-snap-host.mjs`. */
  hostScript: string;
  /** Directory with the fake provider's `profile.json`, `requirements.json`, `plan.json`. */
  fixturesDir: string;
  extensionId: string;
}

/**
 * Registry key Playwright's Chromium reads on Windows (checked in bolt 022: it ignores
 * `Software\Google\Chrome`, where a real cv-snap install registers).
 */
export const WINDOWS_REGISTRY_KEYS = [
  `HKCU\\Software\\Chromium\\NativeMessagingHosts\\${E2E_NATIVE_HOST_NAME}`,
] as const;

export function hostManifest(launcherPath: string, extensionId: string) {
  return {
    name: E2E_NATIVE_HOST_NAME,
    description: "cv-snap end-to-end test host (fake AI provider)",
    path: launcherPath,
    type: "stdio",
    allowed_origins: [`chrome-extension://${extensionId}/`],
  };
}

/** Environment the host runs with: the fake provider, and app data inside `workDir`. */
export function hostEnvironment(workDir: string, fixturesDir: string): Record<string, string> {
  const appData = join(workDir, "app-data");
  return {
    CV_SNAP_FAKE_PROVIDER: fixturesDir,
    LOCALAPPDATA: appData,
    XDG_DATA_HOME: appData,
    HOME: appData,
  };
}

const shellQuote = (value: string) => `'${value.replaceAll("'", "'\\''")}'`;

export function launcherScript(
  platform: NodeJS.Platform,
  env: Record<string, string>,
  nodePath: string,
  hostScript: string,
): string {
  if (platform === "win32") {
    return [
      "@echo off",
      '"%SystemRoot%\\System32\\chcp.com" 65001 >nul',
      ...Object.entries(env).map(([key, value]) => `set "${key}=${value}"`),
      `"${nodePath}" "${hostScript}" %*`,
      "",
    ].join("\r\n");
  }
  return [
    "#!/bin/sh",
    ...Object.entries(env).map(([key, value]) => `export ${key}=${shellQuote(value)}`),
    `exec ${shellQuote(nodePath)} ${shellQuote(hostScript)} "$@"`,
    "",
  ].join("\n");
}

export interface HostRegistration {
  /** Removes the registration and restores what was there before. Idempotent. */
  remove(): void;
}

const reg = (args: string[]) => execFileSync("reg", args, { stdio: "pipe", windowsHide: true });

function queryDefault(key: string): string | null {
  try {
    return /REG_SZ\s+(.+?)\s*$/m.exec(reg(["query", key, "/ve"]).toString("utf8"))?.[1] ?? null;
  } catch {
    return null;
  }
}

export function registerHost(options: HostRegistrationOptions): HostRegistration {
  const { platform, workDir } = options;
  mkdirSync(workDir, { recursive: true });
  const env = hostEnvironment(workDir, options.fixturesDir);
  mkdirSync(join(workDir, "app-data"), { recursive: true });

  const launcherPath = join(workDir, platform === "win32" ? "host.cmd" : "host.sh");
  writeFileSync(launcherPath, launcherScript(platform, env, options.nodePath, options.hostScript), {
    mode: 0o755,
  });
  const manifest = JSON.stringify(hostManifest(launcherPath, options.extensionId), null, 2);

  if (platform !== "win32") {
    const dir = join(options.userDataDir, "NativeMessagingHosts");
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, `${E2E_NATIVE_HOST_NAME}.json`), manifest);
    return { remove: () => undefined };
  }

  const manifestPath = join(workDir, `${E2E_NATIVE_HOST_NAME}.json`);
  writeFileSync(manifestPath, manifest);
  const previous = WINDOWS_REGISTRY_KEYS.map((key) => ({ key, value: queryDefault(key) }));
  for (const key of WINDOWS_REGISTRY_KEYS) {
    reg(["add", key, "/ve", "/t", "REG_SZ", "/d", manifestPath, "/f"]);
  }
  let isRemoved = false;
  return {
    remove() {
      if (isRemoved) return;
      isRemoved = true;
      for (const { key, value } of previous) {
        if (value === null) reg(["delete", key, "/f"]);
        else reg(["add", key, "/ve", "/t", "REG_SZ", "/d", value, "/f"]);
      }
    },
  };
}
