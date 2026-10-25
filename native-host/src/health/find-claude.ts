import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

/** How to start Claude Code: `command` with `prefixArgs` before the real arguments. */
export interface ClaudeCommand {
  command: string;
  prefixArgs: string[];
  /** Where it was found, for logs and the health report (no personal data beyond the path). */
  source: "path" | "winget" | "local-bin" | "npm";
}

export interface FindClaudeDeps {
  env: NodeJS.ProcessEnv;
  platform: NodeJS.Platform;
  nodePath: string;
  exists: (path: string) => boolean;
  listDir: (path: string) => string[];
}

const defaultDeps: FindClaudeDeps = {
  env: process.env,
  platform: process.platform,
  nodePath: process.execPath,
  exists: existsSync,
  listDir: (path) => {
    try {
      return readdirSync(path);
    } catch {
      return [];
    }
  },
};

/**
 * Finds the Claude Code CLI. Chrome may start the host with a different PATH than the user's shell
 * (story 004 edge case), so known per-user install locations are searched after PATH.
 * Only directly spawnable files are returned: a `.cmd` shim can't be spawned without a shell, so
 * an npm install is started as `node <cli.js>` instead.
 */
export function findClaude(overrides: Partial<FindClaudeDeps> = {}): ClaudeCommand | null {
  const { env, platform, nodePath, exists, listDir } = { ...defaultDeps, ...overrides };
  const isWindows = platform === "win32";
  const binaryName = isWindows ? "claude.exe" : "claude";
  const pathSeparator = isWindows ? ";" : ":";
  const pathValue = env.PATH ?? env.Path ?? "";

  for (const directory of pathValue.split(pathSeparator)) {
    if (!directory) continue;
    const candidate = join(directory, binaryName);
    if (exists(candidate)) return { command: candidate, prefixArgs: [], source: "path" };
  }

  if (isWindows && env.LOCALAPPDATA) {
    const packagesDir = join(env.LOCALAPPDATA, "Microsoft", "WinGet", "Packages");
    const packages = listDir(packagesDir)
      .filter((name) => name.startsWith("Anthropic.ClaudeCode_"))
      .sort();
    for (const name of packages) {
      const candidate = join(packagesDir, name, binaryName);
      if (exists(candidate)) return { command: candidate, prefixArgs: [], source: "winget" };
    }
  }

  const home = env.USERPROFILE ?? env.HOME;
  if (home) {
    const candidate = join(home, ".local", "bin", binaryName);
    if (exists(candidate)) return { command: candidate, prefixArgs: [], source: "local-bin" };
  }

  if (isWindows && env.APPDATA) {
    const cli = join(env.APPDATA, "npm", "node_modules", "@anthropic-ai", "claude-code", "cli.js");
    if (exists(cli)) return { command: nodePath, prefixArgs: [cli], source: "npm" };
  }

  return null;
}
