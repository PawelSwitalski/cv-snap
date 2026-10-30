---
stage: plan
bolt: 017-host-package
created: 2026-10-30T16:10:00Z
---

## Implementation Plan: host-package (cross-platform fixes)

### Objective

Make CI green on Windows, macOS and Ubuntu (first run 41084773775 failed on the two non-Windows
OSes), and make the host find Claude Code on macOS and Linux the way people actually install it.

### Deliverables

**Claude Code discovery on macOS and Linux (`native-host/src/health/find-claude.ts`)**
- Search order, the first hit wins:
  1. `PATH`;
  2. Windows only: the WinGet packages;
  3. `~/.local/bin` (native installer);
  4. Windows only: `%APPDATA%\npm` `cli.js`;
  5. macOS and Linux only:
     - the folder of the Node that runs the host, where `npm install -g` puts `claude` under nvm,
       fnm, Homebrew or system Node;
     - `/opt/homebrew/bin` and `/usr/local/bin` (Homebrew and the classic npm prefix);
     - `~/.claude/local` (Claude Code's older local install).
- **Found while planning:** on macOS and Linux, an npm-installed `claude` is a symlink to `cli.js`
  with `#!/usr/bin/env node`. Under Chrome's minimal `PATH` (no nvm, no `/opt/homebrew/bin`),
  `env` can't find `node`, so even a `claude` that is found would fail to start. Each candidate's
  real path is therefore resolved: a `.js` target is started as `node <cli.js>` with the host's
  own Node (as on Windows); anything else (native binary, shell script) is started directly.
- Paths are built with the target OS's separator (`pathFor`), so the Windows cases stay testable
  on Linux and the reverse.

**Tests that assumed Windows**
- `cli/commands.test.ts`:
  - the harness uses the runner's own OS by default (real files);
  - the `.cmd` launcher, registry and file-lock tests run on Windows only (locks are a Windows
    behaviour);
  - the macOS and Linux tests keep running everywhere.
- `test/e2e.test.ts`:
  - the log test expects the per-OS data directory;
  - the stand-in Claude is installed where the host searches on each OS: the npm layout on Windows,
    `~/.local/bin/claude` (an executable shell script starting Node by absolute path) on macOS and
    Linux.
- `health/find-claude.test.ts`: the existing Windows cases are kept with explicit Windows paths, and
  new macOS and Linux cases are added.

### Technical Approach

- `FindClaudeDeps` gets `realpath` (injectable, defaults to `fs.realpathSync`; a failure counts as
  "not found").
- Nothing changes on Windows: same order, same results (the Windows install job passed).
- Verification: run the native-host tests locally, then push and require a green CI on all three
  OSes before Operations resumes.

### Acceptance Criteria

- [ ] macOS and Linux, with Chrome's minimal PATH: Claude Code installed with Homebrew,
  `npm install -g` (nvm, fnm, system Node) or the native installer is found and startable
- [ ] CI `check` and `install` pass on Windows, macOS and Ubuntu
- [ ] Real-file-system tests use the runner's OS layout; Windows-only behaviour is tested on
  Windows only
