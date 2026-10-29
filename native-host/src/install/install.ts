import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { allowedExtensionOrigins, NATIVE_HOST_NAME } from "@cv-snap/shared";
import { runProcess, type ProcessRunner } from "../lib/run-process.js";

/**
 * Registers the native host with Chrome for the current user (no admin rights):
 * a `.cmd` wrapper that starts Node, a host manifest, and an HKCU registry key pointing to it.
 * https://developer.chrome.com/docs/extensions/develop/concepts/native-messaging#native-messaging-host-location
 */

export interface InstallOptions {
  /** Directory for the wrapper and manifest, e.g. `%LOCALAPPDATA%\cv-snap\host`. */
  hostDir: string;
  /** Absolute path of the built `dist/main.js`. */
  mainScriptPath: string;
  /** Absolute path of `node.exe`; Chrome's PATH may not contain Node. */
  nodePath: string;
  hostName?: string;
  /** Defaults to the dev build plus the store build once its ID is set (bolt 013). */
  extensionOrigins?: readonly string[];
  run?: ProcessRunner;
}

export interface InstallResult {
  manifestPath: string;
  wrapperPath: string;
  registryKey: string;
}

export function registryKeyFor(hostName: string): string {
  return `HKCU\\Software\\Google\\Chrome\\NativeMessagingHosts\\${hostName}`;
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

export function buildManifest(
  hostName: string,
  wrapperPath: string,
  extensionOrigins: readonly string[],
) {
  return {
    name: hostName,
    description: "cv-snap native host (runs Claude Code locally)",
    path: wrapperPath,
    type: "stdio",
    allowed_origins: [...extensionOrigins],
  };
}

/** Idempotent: re-running overwrites the files and the registry value. */
export async function installHost(options: InstallOptions): Promise<InstallResult> {
  const hostName = options.hostName ?? NATIVE_HOST_NAME;
  const run = options.run ?? runProcess;
  const wrapperPath = join(options.hostDir, "cv-snap-host.cmd");
  const manifestPath = join(options.hostDir, `${hostName}.json`);
  const registryKey = registryKeyFor(hostName);

  mkdirSync(options.hostDir, { recursive: true });
  writeFileSync(wrapperPath, buildWrapper(options.nodePath, options.mainScriptPath), "utf8");
  const manifest = buildManifest(
    hostName,
    wrapperPath,
    options.extensionOrigins ?? allowedExtensionOrigins(),
  );
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

  const result = await run({
    command: "reg",
    args: ["add", registryKey, "/ve", "/t", "REG_SZ", "/d", manifestPath, "/f"],
    timeoutMs: 15_000,
  });
  if (result.exitCode !== 0) {
    throw new Error(`reg add failed (exit ${String(result.exitCode)}): ${result.stderr.trim()}`);
  }
  return { manifestPath, wrapperPath, registryKey };
}

export interface UninstallOptions {
  hostDir: string;
  hostName?: string;
  run?: ProcessRunner;
}

/** Removes the registry key and the host directory. Succeeds when nothing is installed. */
export async function uninstallHost(options: UninstallOptions): Promise<{ registryKey: string }> {
  const hostName = options.hostName ?? NATIVE_HOST_NAME;
  const run = options.run ?? runProcess;
  const registryKey = registryKeyFor(hostName);

  const query = await run({ command: "reg", args: ["query", registryKey], timeoutMs: 15_000 });
  if (query.exitCode === 0) {
    const result = await run({
      command: "reg",
      args: ["delete", registryKey, "/f"],
      timeoutMs: 15_000,
    });
    if (result.exitCode !== 0) {
      throw new Error(
        `reg delete failed (exit ${String(result.exitCode)}): ${result.stderr.trim()}`,
      );
    }
  }
  rmSync(options.hostDir, { recursive: true, force: true });
  return { registryKey };
}
