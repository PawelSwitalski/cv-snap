---
stage: implement
bolt: 015-host-package
created: 2026-10-29T19:20:00Z
---

## Implementation Walkthrough: host-package (part 2)

### Summary

`cv-snap-host install` now registers the host on macOS and Linux as well as Windows. `doctor`
checks the setup from Node to Claude Code and gives one fix per problem. `pnpm release:pack`
builds the store zip and the host tarball only when the release is consistent. The package also
ships its own 7 MB pdf.js subset, so it has no runtime dependencies (decision a).

### Structure Overview

- **Per-OS table:** `install/platform.ts` holds the data directory, Chrome's manifest directory,
  the launcher name and `~` display paths for each OS. Install, uninstall, doctor and the host's
  logs all read it.
- **Registration:** `install/install.ts` registers per OS (registry or manifest file) and writes a
  `.cmd` or shell launcher.
- **`doctor`:** `cli/doctor.ts` is pure over a small probe interface; `cli/commands.ts` wires the
  real file system, `reg.exe` and the health check.
- **Release checks:** `scripts/release-checks.mjs` is pure; `scripts/release-pack.mjs` runs the
  builds.

### Completed Work

- [x] `native-host/scripts/bundle.mjs` - vendors the pdf.js allowlist into `dist/vendor/pdfjs-dist/`, rewrites the import to it, fails on any other pdf.js import
- [x] `native-host/scripts/pdfjs-runtime-files.json` - the pdf.js allowlist (read by the bundle script and the package test)
- [x] `native-host/package.json` - no `dependencies`; `pdfjs-dist` moved to dev (for unit tests)
- [x] `native-host/src/install/platform.ts` - per-OS paths, `toHostPlatform`, `displayPath` (`~`)
- [x] `native-host/src/lib/paths.ts` - data, log and host dirs from the table (macOS `~/Library/Application Support/cv-snap`, Linux `$XDG_DATA_HOME` or `~/.local/share`)
- [x] `native-host/src/install/install.ts`:
  - per-OS `installHost` / `uninstallHost`;
  - `buildShellLauncher` (single-quoted, `exec`, written `0755`);
  - `parseLauncher`, `manifestPathFor`, `queryRegisteredManifest`
- [x] `native-host/src/install/runtime.ts` - `stageRuntime` copies the package's `dist/` (`resolvePdfjsRoot` removed)
- [x] `native-host/src/cli/doctor.ts` - 7 checks (Node, registration, allowed extensions, launcher, installed version, Claude Code, login), fixes, `~` paths, exit code
- [x] `native-host/src/cli/route.ts`, `commands.ts`, `main.ts` - `doctor` command; the platform context replaces the Windows-only guard; unsupported OS → clear message
- [x] `shared/src/errors.ts`, `shared/src/health.ts` - `HOST_VERSION_MISMATCH`; `getHealthIssues(report, extensionVersion)` adds it as a warning when major or minor differ (`isSameMajorMinor`)
- [x] `extension/src/features/onboarding/setup-check.ts` - passes the extension's manifest version
- [x] `extension` error maps, `SetupCheck` hints, PL and EN `messages.json` - title, hint and fix for the new code
- [x] `scripts/release-checks.mjs`, `scripts/release-pack.mjs`, root `release:pack`, `.gitignore` (`release/`), vitest project `scripts`
- [x] tests updated to the new APIs: install, runtime, commands, route, errors, e2e, package (no dependencies; files limited to the bundle plus the pdf.js allowlist, no source maps)

### Key Decisions

- **pdf.js inside the package (decision a)**:
  - the tarball, pdf.js included, is about 7 MB (NFR-3: ≤ 15 MB);
  - `npx` downloads nothing else;
  - `install` copies `dist/` unchanged.
  The bundle script fails if the code imports any other pdf.js path, so the allowlist can't silently
  miss a file the bundle needs.
- **The OS is a parameter, not `process.platform`**: the macOS and Linux paths and launchers are
  unit-testable on Windows. Real permission bits are checked only off Windows (CI, bolt 016).
- **`doctor` reads the launcher back** (`parseLauncher`), so it checks the Node and runtime that
  Chrome will actually start. This catches a Node removed by nvm or fnm.
- **No personal data in output**: install, uninstall and doctor print paths through
  `displayPath` (`~`). Doctor reads only `loggedIn` from Claude, as the health check already did.
- **`HOST_VERSION_MISMATCH` is a warning**: it never blocks the setup check, and `GenerationError`
  maps it to "retry" only because every code needs an action.

### Deviations from Plan

- macOS logs moved from `~/.local/share/cv-snap` (the old fallback) to `~/Library/Application
  Support/cv-snap`. Nobody runs cv-snap on macOS yet, so nothing needs migrating.

### Dependencies Added

- None (`pdfjs-dist` moved from `dependencies` to `devDependencies`)

### Developer Notes

- Smoke check on this machine:
  - `cv-snap-host doctor` passes all 7 checks against the installed host, with only `~` paths;
  - `pnpm release:pack` refuses with two reasons (store ID, `OWNER` repository) and builds
    nothing.
- The setup hints `hint_HOST_NOT_INSTALLED` / `fix_HOST_NOT_INSTALLED` still say
  `pnpm run install-host` (the developer command). Switching them to `npx cv-snap-host install`
  belongs with the end-user docs in bolt 016.
- One full-suite run had a timing failure in `GenerateView.test.tsx` ("shows the preview…", about
  1 s). It passed alone and in the next full run. The test was not changed by this bolt; keep an
  eye on it under CI load.
