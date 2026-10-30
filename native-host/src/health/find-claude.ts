import { existsSync, readdirSync, realpathSync } from "node:fs";
import { posix, win32 } from "node:path";

/** How to start Claude Code: `command` with `prefixArgs` before the real arguments. */
export interface ClaudeCommand {
  command: string;
  prefixArgs: string[];
  /** Where it was found, for logs and the health report (no personal data beyond the path). */
  source: "path" | "winget" | "local-bin" | "npm" | "node-bin" | "system-bin";
}

export interface FindClaudeDeps {
  env: NodeJS.ProcessEnv;
  platform: NodeJS.Platform;
  nodePath: string;
  exists: (path: string) => boolean;
  listDir: (path: string) => string[];
  /** Real path behind a symlink (macOS, Linux); throws when the file is missing. */
  realpath: (path: string) => string;
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
  realpath: realpathSync,
};

/** Homebrew (Apple silicon, then Intel and the classic npm prefix). */
const SYSTEM_BIN_DIRS = ["/opt/homebrew/bin", "/usr/local/bin"];

/**
 * Finds the Claude Code CLI. Chrome may start the host with a different PATH than the user's shell
 * (story 004 edge case; on macOS a Dock-started Chrome has only the system folders), so known
 * install locations are searched after PATH.
 *
 * Only directly startable commands are returned:
 * - a `.cmd` shim can't be spawned without a shell, so a Windows npm install runs as `node <cli.js>`;
 * - on macOS and Linux an npm install is a symlink to `cli.js` with `#!/usr/bin/env node`, which
 *   fails when Chrome's PATH has no `node` (nvm, fnm, Homebrew), so it also runs as `node <cli.js>`
 *   with the host's own Node (bolt 017).
 */
export function findClaude(overrides: Partial<FindClaudeDeps> = {}): ClaudeCommand | null {
  const deps = { ...defaultDeps, ...overrides };
  const { env, platform, nodePath, exists, listDir } = deps;
  const isWindows = platform === "win32";
  const { join, dirname } = isWindows ? win32 : posix;
  const binaryName = isWindows ? "claude.exe" : "claude";
  const pathSeparator = isWindows ? ";" : ":";
  const pathValue = env.PATH ?? env.Path ?? "";

  /** A found file as a command: Windows binaries as they are, POSIX ones by their real target. */
  const startable = (candidate: string, source: ClaudeCommand["source"]): ClaudeCommand | null => {
    if (!exists(candidate)) return null;
    if (isWindows) return { command: candidate, prefixArgs: [], source };
    let target: string;
    try {
      target = deps.realpath(candidate);
    } catch {
      return null;
    }
    return /\.(c|m)?js$/.test(target)
      ? { command: nodePath, prefixArgs: [target], source: source === "path" ? "path" : "npm" }
      : { command: candidate, prefixArgs: [], source };
  };

  for (const directory of pathValue.split(pathSeparator)) {
    if (!directory) continue;
    const found = startable(join(directory, binaryName), "path");
    if (found) return found;
  }

  if (isWindows && env.LOCALAPPDATA) {
    const packagesDir = join(env.LOCALAPPDATA, "Microsoft", "WinGet", "Packages");
    const packages = listDir(packagesDir)
      .filter((name) => name.startsWith("Anthropic.ClaudeCode_"))
      .sort();
    for (const name of packages) {
      const found = startable(join(packagesDir, name, binaryName), "winget");
      if (found) return found;
    }
  }

  const home = isWindows ? (env.USERPROFILE ?? env.HOME) : (env.HOME ?? env.USERPROFILE);
  if (home) {
    const found = startable(join(home, ".local", "bin", binaryName), "local-bin");
    if (found) return found;
  }

  if (isWindows) {
    if (env.APPDATA) {
      const cli = join(
        env.APPDATA,
        "npm",
        "node_modules",
        "@anthropic-ai",
        "claude-code",
        "cli.js",
      );
      if (exists(cli)) return { command: nodePath, prefixArgs: [cli], source: "npm" };
    }
    return null;
  }

  // macOS and Linux: `npm install -g` puts `claude` next to the Node that installed it.
  const nextToNode = startable(join(dirname(nodePath), binaryName), "node-bin");
  if (nextToNode) return nextToNode;
  for (const directory of SYSTEM_BIN_DIRS) {
    const found = startable(join(directory, binaryName), "system-bin");
    if (found) return found;
  }
  if (home) {
    const found = startable(join(home, ".claude", "local", binaryName), "local-bin");
    if (found) return found;
  }
  return null;
}
