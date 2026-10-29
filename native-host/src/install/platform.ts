import { homedir } from "node:os";
import { posix, win32 } from "node:path";

/**
 * Where cv-snap lives on each OS (story 004-macos-linux-registration): one table, so install,
 * uninstall, doctor and the host's logs all agree. Everything is per user, no admin rights.
 * https://developer.chrome.com/docs/extensions/develop/concepts/native-messaging#native-messaging-host-location
 */

export type HostPlatform = "win32" | "darwin" | "linux";

export interface PlatformContext {
  platform: HostPlatform;
  env: NodeJS.ProcessEnv;
  home: string;
}

export function toHostPlatform(platform: NodeJS.Platform): HostPlatform | null {
  return platform === "win32" || platform === "darwin" || platform === "linux" ? platform : null;
}

/** The context of this process; unsupported systems fall back to the Linux layout. */
export function currentPlatform(): PlatformContext {
  return {
    platform: toHostPlatform(process.platform) ?? "linux",
    env: process.env,
    home: homedir(),
  };
}

/** Path functions of the target OS (so other OSes' layouts are testable anywhere). */
export const pathFor = (platform: HostPlatform) => (platform === "win32" ? win32 : posix);

/** Joins with the separator of the target OS (so other OSes' layouts are testable anywhere). */
export function joinFor(context: PlatformContext, ...parts: string[]): string {
  return pathFor(context.platform).join(...parts);
}

/** Per-user data directory: logs, the installed host and temporary run folders. */
export function dataDir(context: PlatformContext): string {
  const { platform, env, home } = context;
  switch (platform) {
    case "win32":
      return joinFor(context, env.LOCALAPPDATA ?? win32.join(home, "AppData", "Local"), "cv-snap");
    case "darwin":
      return joinFor(context, home, "Library", "Application Support", "cv-snap");
    case "linux":
      return joinFor(context, env.XDG_DATA_HOME || posix.join(home, ".local", "share"), "cv-snap");
  }
}

export function hostDir(context: PlatformContext): string {
  return joinFor(context, dataDir(context), "host");
}

/** Chrome's per-user manifest directory; Windows uses the registry instead (null). */
export function chromeManifestDir(context: PlatformContext): string | null {
  switch (context.platform) {
    case "win32":
      return null;
    case "darwin":
      return joinFor(
        context,
        context.home,
        "Library",
        "Application Support",
        "Google",
        "Chrome",
        "NativeMessagingHosts",
      );
    case "linux":
      return joinFor(context, context.home, ".config", "google-chrome", "NativeMessagingHosts");
  }
}

export function launcherFileName(platform: HostPlatform): string {
  return platform === "win32" ? "cv-snap-host.cmd" : "cv-snap-host";
}

/** Shortens paths under the home directory to `~`, so output never shows the user name. */
export function displayPath(context: PlatformContext, path: string): string {
  const { home } = context;
  if (home === "") return path;
  const sameCase = context.platform === "win32" ? path.toLowerCase() : path;
  const homeCase = context.platform === "win32" ? home.toLowerCase() : home;
  return sameCase === homeCase || sameCase.startsWith(homeCase + pathFor(context.platform).sep)
    ? `~${path.slice(home.length)}`
    : path;
}
