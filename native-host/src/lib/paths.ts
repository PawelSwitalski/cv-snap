import {
  currentPlatform,
  dataDir,
  hostDir,
  joinFor,
  type PlatformContext,
} from "../install/platform.js";

/**
 * Per-user data directory of cv-snap: `%LOCALAPPDATA%\cv-snap` on Windows,
 * `~/Library/Application Support/cv-snap` on macOS, `~/.local/share/cv-snap` on Linux.
 */
export function appDataDir(context: PlatformContext = currentPlatform()): string {
  return dataDir(context);
}

export function logDir(context: PlatformContext = currentPlatform()): string {
  return joinFor(context, dataDir(context), "logs");
}

/** Where `install` puts the runtime, the launcher and (on Windows) the host manifest. */
export function hostInstallDir(context: PlatformContext = currentPlatform()): string {
  return hostDir(context);
}
