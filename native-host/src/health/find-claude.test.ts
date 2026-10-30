import { posix, win32 } from "node:path";
import { describe, expect, it } from "vitest";
import { findClaude, type FindClaudeDeps } from "./find-claude.js";

const LOCAL = "C:\\Users\\jan\\AppData\\Local";
const ROAMING = "C:\\Users\\jan\\AppData\\Roaming";
const HOME = "C:\\Users\\jan";
const WINGET = win32.join(LOCAL, "Microsoft", "WinGet", "Packages");

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
    const exe = win32.join(WINGET, pkg, "claude.exe");

    const found = findClaude(deps([exe], { [WINGET]: ["Other.App_1", pkg] }));

    expect(found).toEqual({ command: exe, prefixArgs: [], source: "winget" });
  });

  it("finds the native installer location in ~/.local/bin", () => {
    const exe = win32.join(HOME, ".local", "bin", "claude.exe");

    expect(findClaude(deps([exe]))?.source).toBe("local-bin");
  });

  it("runs an npm install through node with cli.js as the first argument", () => {
    const cli = win32.join(
      ROAMING,
      "npm",
      "node_modules",
      "@anthropic-ai",
      "claude-code",
      "cli.js",
    );

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
      exists: (candidate) => candidate === posix.join("/home/jan/bin", "claude"),
      listDir: () => [],
      realpath: (path) => path,
    });

    expect(found?.command).toBe(posix.join("/home/jan/bin", "claude"));
  });
});

/** A POSIX machine: `links` maps a file to its symlink target (files are their own target). */
function posixDeps(
  files: string[],
  options: {
    links?: Record<string, string>;
    path?: string;
    platform?: "darwin" | "linux";
    nodePath?: string;
  } = {},
): Partial<FindClaudeDeps> {
  const links = options.links ?? {};
  return {
    platform: options.platform ?? "darwin",
    nodePath: options.nodePath ?? "/Users/jan/.nvm/versions/node/v24.1.0/bin/node",
    env: { PATH: options.path ?? "/usr/bin:/bin:/usr/sbin:/sbin", HOME: "/Users/jan" },
    exists: (candidate) => files.includes(candidate) || candidate in links,
    listDir: () => [],
    realpath: (candidate) => {
      const target = links[candidate] ?? (files.includes(candidate) ? candidate : undefined);
      if (target === undefined || !files.includes(target)) throw new Error("ENOENT");
      return target;
    },
  };
}

describe("findClaude on macOS and Linux (Chrome's minimal PATH, bolt 017)", () => {
  const NVM_BIN = "/Users/jan/.nvm/versions/node/v24.1.0/bin";
  const NVM_CLI =
    "/Users/jan/.nvm/versions/node/v24.1.0/lib/node_modules/@anthropic-ai/claude-code/cli.js";

  it("finds an npm install next to the host's Node (nvm) and starts cli.js with that Node", () => {
    const found = findClaude(posixDeps([NVM_CLI], { links: { [`${NVM_BIN}/claude`]: NVM_CLI } }));

    expect(found).toEqual({
      command: `${NVM_BIN}/node`,
      prefixArgs: [NVM_CLI],
      source: "npm",
    });
  });

  it("finds Homebrew's native binary in /opt/homebrew/bin and starts it directly", () => {
    const binary = "/opt/homebrew/Caskroom/claude-code/2.1.400/claude";

    const found = findClaude(
      posixDeps([binary], { links: { "/opt/homebrew/bin/claude": binary } }),
    );

    expect(found).toEqual({
      command: "/opt/homebrew/bin/claude",
      prefixArgs: [],
      source: "system-bin",
    });
  });

  it("starts an npm install under Homebrew's Node (/opt/homebrew/bin) with the host's Node", () => {
    const cli = "/opt/homebrew/lib/node_modules/@anthropic-ai/claude-code/cli.js";

    const found = findClaude(
      posixDeps([cli], {
        links: { "/opt/homebrew/bin/claude": cli },
        nodePath: "/usr/local/bin/node",
      }),
    );

    expect(found).toEqual({ command: "/usr/local/bin/node", prefixArgs: [cli], source: "npm" });
  });

  it("finds the native installer in ~/.local/bin on Linux", () => {
    const binary = "/Users/jan/.local/share/claude/versions/2.1.400";

    const found = findClaude(
      posixDeps([binary], { platform: "linux", links: { "/Users/jan/.local/bin/claude": binary } }),
    );

    expect(found).toEqual({
      command: "/Users/jan/.local/bin/claude",
      prefixArgs: [],
      source: "local-bin",
    });
  });

  it("finds Claude Code's older local install in ~/.claude/local", () => {
    const found = findClaude(posixDeps(["/Users/jan/.claude/local/claude"]));

    expect(found?.command).toBe("/Users/jan/.claude/local/claude");
  });

  it("starts a PATH entry that links to cli.js with the host's Node too", () => {
    const found = findClaude(
      posixDeps([NVM_CLI], {
        path: "/usr/bin:/custom/bin",
        links: { "/custom/bin/claude": NVM_CLI },
      }),
    );

    expect(found).toEqual({ command: `${NVM_BIN}/node`, prefixArgs: [NVM_CLI], source: "path" });
  });

  it("prefers PATH, then ~/.local/bin, then next to Node, then the system folders", () => {
    const all = [
      "/custom/bin/claude",
      "/Users/jan/.local/bin/claude",
      `${NVM_BIN}/claude`,
      "/opt/homebrew/bin/claude",
    ];

    expect(findClaude(posixDeps(all, { path: "/custom/bin" }))?.command).toBe(all[0]);
    expect(findClaude(posixDeps(all.slice(1)))?.command).toBe(all[1]);
    expect(findClaude(posixDeps(all.slice(2)))?.command).toBe(all[2]);
    expect(findClaude(posixDeps(all.slice(3)))?.command).toBe(all[3]);
  });

  it("skips a broken symlink and keeps looking", () => {
    const found = findClaude(
      posixDeps(["/usr/local/bin/claude"], {
        links: { [`${NVM_BIN}/claude`]: "/gone/cli.js" },
      }),
    );

    expect(found?.command).toBe("/usr/local/bin/claude");
  });

  it("returns null when Claude Code is nowhere", () => {
    expect(findClaude(posixDeps([]))).toBeNull();
  });
});
