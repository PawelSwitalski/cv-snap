---
stage: implement
bolt: 017-host-package
created: 2026-10-30T16:45:00Z
---

## Implementation Walkthrough: host-package (cross-platform fixes)

### Summary

The host now finds Claude Code on macOS and Linux where people actually install it, and can start
an npm-installed Claude Code even when Chrome's PATH has no `node`. The tests that assumed Windows
now use the layout of the OS they run on, so CI can pass on all three.

### Structure Overview

All changes are in `native-host`: the Claude Code lookup, plus three test files. Windows behaviour
of the host is unchanged.

### Completed Work

- [x] `native-host/src/health/find-claude.ts`:
  - search order: `PATH` → WinGet (Windows) → `~/.local/bin` → `%APPDATA%` npm (Windows) → next to
    the host's Node → `/opt/homebrew/bin`, `/usr/local/bin` → `~/.claude/local` (macOS, Linux);
  - on macOS and Linux each candidate's real path is resolved: a `.js` target runs as
    `node <cli.js>` with the host's own Node, anything else directly;
  - paths are built with the target OS's separator;
  - new sources `node-bin` and `system-bin` for logs.
- [x] `native-host/src/health/find-claude.test.ts` - explicit Windows and POSIX path joins; the POSIX case injects `realpath`
- [x] `native-host/src/cli/commands.test.ts` - the harness uses the runner's OS; the `.cmd`, registry and file-lock tests run on Windows only
- [x] `native-host/test/e2e.test.ts`:
  - the log test expects the per-OS data directory;
  - the stand-in Claude is installed per OS (`installFakeClaude`): the npm layout on Windows, an
    executable `~/.local/bin/claude` shell script on macOS and Linux.

### Key Decisions

- **Resolve, then decide how to start**: the problem isn't only finding `claude`. An npm `claude`
  on macOS and Linux depends on `env node`, which Chrome's PATH may not provide. Starting `cli.js`
  with the host's own Node (the one that ran `install`) is the same approach that already works
  on Windows.
- **Next to the host's Node first**: under nvm or fnm, npm's global bin folder is the folder of the
  Node binary. The launcher pins that Node, so this location matches what the user installed with.
- **Windows-only behaviour is tested on Windows**: the registry, `.cmd` launchers and file locks
  don't exist elsewhere. The cross-OS layout is still tested everywhere through the macOS and
  Linux cases.

### Deviations from Plan

- None.

### Dependencies Added

- None

### Developer Notes

- Locally on Windows: 1,062 tests pass (1 skipped), typecheck, lint and format clean. The macOS and
  Ubuntu results come from CI after the push (Stage 3).
