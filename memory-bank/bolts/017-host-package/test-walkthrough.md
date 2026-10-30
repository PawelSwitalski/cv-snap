---
stage: test
bolt: 017-host-package
created: 2026-10-30T17:20:00Z
---

## Test Report: host-package (cross-platform fixes)

### Summary

- **Tests**: 1,071 passed, 1 skipped locally on Windows (`pnpm test`); 9 new.
- **CI**: run 41087387628 is **green on all three OSes**: `check` (Ubuntu) and `install` on
  Windows, macOS and Ubuntu.
  - The first fix run (41086940938) left one e2e check that still looked for the run folder in the
    Windows data directory. It was fixed in `2f44486`.
- **The real install flow on each OS** (from the CI log): the packed host installed, `doctor`
  passed (Node 24.22.1, registration, allowed extension, launcher, installed version), `uninstall`
  removed it, and `doctor` then reported the missing registration. Paths were shown with `~` on
  every OS:
  - macOS: `~/Library/Application Support/Google/Chrome/NativeMessagingHosts/com.cvsnap.host.json`,
    runtime in `~/Library/Application Support/cv-snap/host/runtime`;
  - Ubuntu: `~/.config/google-chrome/NativeMessagingHosts/com.cvsnap.host.json`, runtime in
    `~/.local/share/cv-snap/host/runtime`;
  - Windows: `~\AppData\Local\cv-snap\host\com.cvsnap.host.json`, registry key removed on
    uninstall.
- **Stand-in Claude Code on macOS and Ubuntu**: the e2e test's profile, requirements and tailoring
  run went through the host to a `claude` in `~/.local/bin`, so the lookup works with an empty
  `PATH`.
- **Privacy policy online**: `https://pawelswitalski.github.io/cv-snap/privacy/` and `/privacy/pl`
  return 200.
- **Coverage**: 95% (`find-claude.ts` 95%).

### Test Files

- [x] `native-host/src/health/find-claude.test.ts` (9 new macOS and Linux cases, Chrome's minimal
  `PATH`):
  - npm install next to the host's nvm Node → started as `node <cli.js>`;
  - Homebrew native binary in `/opt/homebrew/bin` → started directly;
  - npm under Homebrew's Node → started with the host's Node;
  - native installer in `~/.local/bin` (Linux);
  - `~/.claude/local`;
  - a `PATH` entry linking to `cli.js` → started with the host's Node;
  - search order;
  - a broken symlink is skipped;
  - nothing found → null.
- [x] `native-host/src/cli/commands.test.ts`: real-file tests on the runner's OS; Windows-only
  tests gated.
- [x] `native-host/test/e2e.test.ts`: per-OS data directory (`appDataFor`) for the log file and
  the run-folder clean-up; the stand-in Claude per OS.

### Acceptance Criteria Validation

- ✅ **macOS and Linux with Chrome's minimal PATH: Claude Code from Homebrew, npm -g (nvm, fnm,
  system Node) or the native installer is found and startable** (find-claude.test; e2e on CI
  macOS and Ubuntu)
- ✅ **CI `check` and `install` pass on Windows, macOS and Ubuntu** (run 41087387628)
- ✅ **Real-file-system tests use the runner's OS layout; Windows-only behaviour is tested on
  Windows only** (commands.test, e2e.test)

### Issues Found

- One more Windows-path assumption in the e2e clean-up check, found by the first fix run and
  fixed.
- CI notice: `actions/checkout@v4`, `setup-node@v4` and `pnpm/action-setup@v4` targeted the
  deprecated Node 20. At the user's request they moved to their Node 24 majors (`checkout@v7`,
  `setup-node@v7`, `pnpm/action-setup@v6`, commit `8922579`); CI stayed green on all three OSes
  and the deprecation notice is gone.

### Manual check

- ✅ Confirmed by the user. Not needed beyond CI: the change only affects macOS and Linux, which CI ran for real. Windows
  behaviour is unchanged, and the Windows install job passed.
