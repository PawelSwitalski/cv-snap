import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { findClaude, type FindClaudeDeps } from "./find-claude.js";

const LOCAL = "C:\\Users\\jan\\AppData\\Local";
const ROAMING = "C:\\Users\\jan\\AppData\\Roaming";
const HOME = "C:\\Users\\jan";
const WINGET = join(LOCAL, "Microsoft", "WinGet", "Packages");

function deps(
  files: string[],
  dirs: Record<string, string[]> = {},
  path = "",
): Partial<FindClaudeDeps> {
  return {
    platform: "win32",
    nodePath: "C:\\Program Files\\nodejs\\node.exe",
    env: { PATH: path, LOCALAPPDATA: LOCAL, APPDATA: ROAMING, USERPROFILE: HOME },
    exists: (candidate) => files.includes(candidate),
    listDir: (directory) => dirs[directory] ?? [],
  };
}

describe("findClaude", () => {
  it("prefers claude.exe on PATH", () => {
    const onPath = "C:\\tools\\claude.exe";

    const found = findClaude(deps([onPath], {}, "C:\\Windows;C:\\tools"));

    expect(found).toEqual({ command: onPath, prefixArgs: [], source: "path" });
  });

  it("ignores a claude.cmd shim on PATH, which can't be spawned without a shell", () => {
    expect(findClaude(deps(["C:\\npm\\claude.cmd"], {}, "C:\\npm"))).toBeNull();
  });

  it("finds a WinGet install that is not on Chrome's PATH", () => {
    const pkg = "Anthropic.ClaudeCode_Microsoft.Winget.Source_8wekyb3d8bbwe";
    const exe = join(WINGET, pkg, "claude.exe");

    const found = findClaude(deps([exe], { [WINGET]: ["Other.App_1", pkg] }));

    expect(found).toEqual({ command: exe, prefixArgs: [], source: "winget" });
  });

  it("finds the native installer location in ~/.local/bin", () => {
    const exe = join(HOME, ".local", "bin", "claude.exe");

    expect(findClaude(deps([exe]))?.source).toBe("local-bin");
  });

  it("runs an npm install through node with cli.js as the first argument", () => {
    const cli = join(ROAMING, "npm", "node_modules", "@anthropic-ai", "claude-code", "cli.js");

    expect(findClaude(deps([cli]))).toEqual({
      command: "C:\\Program Files\\nodejs\\node.exe",
      prefixArgs: [cli],
      source: "npm",
    });
  });

  it("returns null when Claude Code is nowhere to be found", () => {
    expect(findClaude(deps([]))).toBeNull();
  });

  it("uses the platform's binary name and PATH separator outside Windows", () => {
    const found = findClaude({
      platform: "linux",
      env: { PATH: "/usr/bin:/home/jan/bin", HOME: "/home/jan" },
      exists: (candidate) => candidate === join("/home/jan/bin", "claude"),
      listDir: () => [],
    });

    expect(found?.command).toBe(join("/home/jan/bin", "claude"));
  });
});
