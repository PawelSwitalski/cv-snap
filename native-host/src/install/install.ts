import { chmodSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { allowedExtensionOrigins, NATIVE_HOST_NAME } from "@cv-snap/shared";
import { runProcess, type ProcessRunner } from "../lib/run-process.js";
import { launcherFileName, pathFor, type HostPlatform } from "./platform.js";

/**
 * Registers the native host with Chrome for the current user (no admin rights, no download):
 * a launcher that starts the installed runtime with Node, a host manifest pointing to it, and on
 * Windows an HKCU registry value pointing to the manifest. On macOS and Linux the manifest itself
 * goes into Chrome's `NativeMessagingHosts` directory (story 004).
 * https://developer.chrome.com/docs/extensions/develop/concepts/native-messaging#native-messaging-host-location
 */

export interface InstallOptions {
  platform: HostPlatform;
  /** Directory for the launcher (and on Windows the manifest), e.g. `%LOCALAPPDATA%\cv-snap\host`. */
  hostDir: string;
  /** Chrome's per-user manifest directory on macOS and Linux; ignored on Windows. */
  manifestDir: string | null;
  /** Absolute path of the installed runtime entry (`runtime/cv-snap-host.mjs`). */
  mainScriptPath: string;
  /** Absolute path of Node; Chrome's PATH may not contain Node (or a version manager's shims). */
  nodePath: string;
  hostName?: string;
  /** Defaults to the dev build plus the store build once its ID is set (bolt 013). */
  extensionOrigins?: readonly string[];
  run?: ProcessRunner;
}

export interface InstallResult {
  manifestPath: string;
  launcherPath: string;
  /** The HKCU key on Windows, null elsewhere (the manifest location is the registration). */
  registryKey: string | null;
}

export function registryKeyFor(hostName: string): string {
  return `HKCU\\Software\\Google\\Chrome\\NativeMessagingHosts\\${hostName}`;
}

/** Where the host manifest goes: the host dir on Windows, Chrome's directory elsewhere. */
export function manifestPathFor(
  options: Pick<InstallOptions, "platform" | "hostDir" | "manifestDir" | "hostName">,
): string {
  const hostName = options.hostName ?? NATIVE_HOST_NAME;
  const { join } = pathFor(options.platform);
  if (options.platform === "win32") return join(options.hostDir, `${hostName}.json`);
  if (options.manifestDir === null) throw new Error("Chrome's manifest directory is unknown");
  return join(options.manifestDir, `${hostName}.json`);
}

/**
 * Batch wrapper Chrome launches. `chcp 65001` makes cmd read the following lines as UTF-8, so
 * paths with Polish characters survive; every path is quoted for spaces. `chcp` is called by its
 * full path: if PATH lacks System32, a bare `chcp` fails silently and non-ASCII paths break.
 */
export function buildWrapper(nodePath: string, mainScriptPath: string): string {
  return [
    "@echo off",
    '"%SystemRoot%\\System32\\chcp.com" 65001 >nul',
    `"${nodePath}" "${mainScriptPath}" %*`,
    "",
  ].join("\r\n");
}

/** POSIX shell single quoting: safe for spaces, `$`, quotes and non-ASCII characters. */
const shellQuote = (value: string) => `'${value.replaceAll("'", "'\\''")}'`;

/** Launcher for macOS and Linux; `exec` so Chrome's pipes go straight to Node. */
export function buildShellLauncher(nodePath: string, mainScriptPath: string): string {
  return ["#!/bin/sh", `exec ${shellQuote(nodePath)} ${shellQuote(mainScriptPath)} "$@"`, ""].join(
    "\n",
  );
}

export function buildLauncher(
  platform: HostPlatform,
  nodePath: string,
  mainScriptPath: string,
): string {
  return platform === "win32"
    ? buildWrapper(nodePath, mainScriptPath)
    : buildShellLauncher(nodePath, mainScriptPath);
}

/** Reads back what a launcher starts (for `doctor`); null if it isn't one of ours. */
export function parseLauncher(
  content: string,
): { nodePath: string; mainScriptPath: string } | null {
  const cmd = /^"([^"]+)" "([^"]+)" %\*\r?$/m.exec(content);
  if (cmd?.[1] && cmd[2]) return { nodePath: cmd[1], mainScriptPath: cmd[2] };
  const quoted = String.raw`'((?:[^']|'\\'')*)'`;
  const sh = new RegExp(String.raw`^exec ${quoted} ${quoted} "\$@"$`, "m").exec(content);
  const unquote = (value: string) => value.replaceAll("'\\''", "'");
  if (sh?.[1] !== undefined && sh[2] !== undefined) {
    return { nodePath: unquote(sh[1]), mainScriptPath: unquote(sh[2]) };
  }
  return null;
}

export function buildManifest(
  hostName: string,
  launcherPath: string,
  extensionOrigins: readonly string[],
) {
  return {
    name: hostName,
    description: "cv-snap native host (runs Claude Code locally)",
    path: launcherPath,
    type: "stdio",
    allowed_origins: [...extensionOrigins],
  };
}

/** Idempotent: re-running overwrites the files and the registration. */
export async function installHost(options: InstallOptions): Promise<InstallResult> {
  const hostName = options.hostName ?? NATIVE_HOST_NAME;
  const run = options.run ?? runProcess;
  const { dirname, join } = pathFor(options.platform);
  const launcherPath = join(options.hostDir, launcherFileName(options.platform));
  const manifestPath = manifestPathFor(options);

  mkdirSync(options.hostDir, { recursive: true });
  writeFileSync(
    launcherPath,
    buildLauncher(options.platform, options.nodePath, options.mainScriptPath),
    "utf8",
  );
  if (options.platform !== "win32") chmodSync(launcherPath, 0o755);
  const manifest = buildManifest(
    hostName,
    launcherPath,
    options.extensionOrigins ?? allowedExtensionOrigins(),
  );
  mkdirSync(dirname(manifestPath), { recursive: true });
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

  if (options.platform !== "win32") return { manifestPath, launcherPath, registryKey: null };

  const registryKey = registryKeyFor(hostName);
  const result = await run({
    command: "reg",
    args: ["add", registryKey, "/ve", "/t", "REG_SZ", "/d", manifestPath, "/f"],
    timeoutMs: 15_000,
  });
  if (result.exitCode !== 0) {
    throw new Error(`reg add failed (exit ${String(result.exitCode)}): ${result.stderr.trim()}`);
  }
  return { manifestPath, launcherPath, registryKey };
}

export interface UninstallOptions {
  platform: HostPlatform;
  hostDir: string;
  manifestDir: string | null;
  hostName?: string;
  run?: ProcessRunner;
}

/**
 * Removes the registration (registry key, or the manifest in Chrome's directory) and the host
 * directory. Succeeds when nothing is installed. Returns what was registered.
 */
export async function uninstallHost(options: UninstallOptions): Promise<{ registration: string }> {
  const hostName = options.hostName ?? NATIVE_HOST_NAME;
  const run = options.run ?? runProcess;

  let registration: string;
  if (options.platform === "win32") {
    registration = registryKeyFor(hostName);
    const query = await run({ command: "reg", args: ["query", registration], timeoutMs: 15_000 });
    if (query.exitCode === 0) {
      const result = await run({
        command: "reg",
        args: ["delete", registration, "/f"],
        timeoutMs: 15_000,
      });
      if (result.exitCode !== 0) {
        throw new Error(
          `reg delete failed (exit ${String(result.exitCode)}): ${result.stderr.trim()}`,
        );
      }
    }
  } else {
    registration = manifestPathFor({ ...options, hostName });
    rmSync(registration, { force: true });
  }
  rmSync(options.hostDir, { recursive: true, force: true });
  return { registration };
}

/** The manifest path registered under HKCU, or null when the key or value is missing. */
export async function queryRegisteredManifest(
  hostName: string = NATIVE_HOST_NAME,
  run: ProcessRunner = runProcess,
): Promise<string | null> {
  const result = await run({
    command: "reg",
    args: ["query", registryKeyFor(hostName), "/ve"],
    timeoutMs: 15_000,
  });
  if (result.exitCode !== 0) return null;
  return /REG_SZ\s+(.+?)\s*$/m.exec(result.stdout)?.[1] ?? null;
}
