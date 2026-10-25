import { homedir } from "node:os";
import { join } from "node:path";

/** Per-user data directory of cv-snap: `%LOCALAPPDATA%\cv-snap` on Windows. */
export function appDataDir(env: NodeJS.ProcessEnv = process.env): string {
  const base = env.LOCALAPPDATA ?? join(homedir(), ".local", "share");
  return join(base, "cv-snap");
}

export function logDir(env: NodeJS.ProcessEnv = process.env): string {
  return join(appDataDir(env), "logs");
}

/** Where `install-host` puts the `.cmd` wrapper and the native-messaging manifest. */
export function hostInstallDir(env: NodeJS.ProcessEnv = process.env): string {
  return join(appDataDir(env), "host");
}
