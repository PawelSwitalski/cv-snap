---
stage: plan
bolt: 015-host-package
created: 2026-10-29T18:20:00Z
---

## Implementation Plan: host-package (part 2)

### Objective

`npx cv-snap-host install` works on macOS and Linux as well as Windows; `cv-snap-host doctor`
checks the whole setup and says how to fix each problem; and `pnpm release:pack` builds both
release packages only when they are consistent and ready for the store.

### Deliverables

**Registration on macOS and Linux (story 004)**
- `native-host/src/install/platform.ts` (pure, one table per OS):
  - data dir:
    - Windows: `%LOCALAPPDATA%\cv-snap`;
    - macOS: `~/Library/Application Support/cv-snap`;
    - Linux: `$XDG_DATA_HOME/cv-snap`, else `~/.local/share/cv-snap`;
  - Chrome's manifest location: the HKCU registry key on Windows;
    `~/Library/Application Support/Google/Chrome/NativeMessagingHosts/` on macOS;
    `~/.config/google-chrome/NativeMessagingHosts/` on Linux;
  - launcher: `cv-snap-host.cmd` on Windows, `cv-snap-host` (shell script) elsewhere.
  - `lib/paths.ts` uses the table, so logs move to the per-OS data dir too.
- `install.ts`:
  - `buildShellLauncher(nodePath, entryPath)`: `#!/bin/sh` +
    `exec '<node>' '<entry>' "$@"`, single-quoted so spaces and quotes in paths are safe; written
    with mode `0755`;
  - `installHost` registers per OS: Windows writes the registry value as today; macOS and Linux
    write the manifest into Chrome's `NativeMessagingHosts` directory, creating it if needed;
  - `uninstallHost` removes the registry value or the manifest file, plus the host directory.
- The "only automated on Windows" guard is removed. No step needs admin rights or a download.

**`doctor` (story 005)**
- `native-host/src/cli/doctor.ts`: a list of checks, each `pass | warn | fail`, with a one-line
  fix:
  1. Node ≥ 24 (the Node running `doctor`);
  2. registration: the registry value or manifest file exists and points at the host manifest;
  3. manifest: valid, its launcher exists, `allowed_origins` equals the trusted IDs (dev, plus
     store once set) → otherwise "run `npx cv-snap-host install`";
  4. launcher: the Node and runtime it starts both exist (catches a removed nvm/fnm Node);
  5. installed runtime version equals this package's version → otherwise warn "run install to
     upgrade";
  6. Claude Code, reusing `checkHealth`: found, logged in (fix: run `claude` and log in), version
     supported (warn: `claude update`).
- Output: one line per check (`✓`, `!`, `✗`), the fix under each problem, and the paths shortened to
  `~`, so no user name is printed. Exit 0 when nothing fails (warnings allowed), else 1.
- `doctor` is added to `routeArgs` and the usage text.
- `install.ts` gets `parseLauncher` (the inverse of both launcher builders) so doctor can read the
  Node and runtime paths back; tested as a round trip.

**Release packing and version check (story 006)**
- `scripts/release-checks.mjs` (pure): `releaseProblems({ extensionVersion, hostVersion,
  storeExtensionId, repositoryUrl })` returns readable reasons:
  - versions differ;
  - store ID is empty;
  - the `repository` URL is still the `OWNER` placeholder (found in bolt 014).
- `scripts/release-pack.mjs` = root `pnpm release:pack`:
  1. build `shared`, run the checks, and stop with every reason if any fails;
  2. then `zip:release` (extension) and `pnpm pack` (host) into `release/` (git-ignored);
  3. print both file names and sizes.
- Setup check in the extension: `getHealthIssues(report, extensionVersion)` adds a
  `HOST_VERSION_MISMATCH` **warning** when major or minor differ; patch differences are fine.
  - New error code with PL and EN title, hint and fix texts: "run `npx cv-snap-host install` to
    update the host".
  - It doesn't block anything.
- A vitest project `scripts` (node environment) for `scripts/**/*.test.mjs`.

### Decision to confirm

**a. Ship the pdf.js subset inside the package (NFR-3).**
- NFR-3 caps the host at 15 MB unpacked **with pdfjs-dist included**. As a normal dependency, npm
  downloads all 35 MB of pdfjs-dist, so the requirement fails today.
- Proposal: `bundle.mjs` copies the 7 MB allowlist (bolt 014) into `dist/vendor/pdfjs-dist/` and
  the bundle imports it by relative path. pdfjs-dist moves to `devDependencies` (for unit tests).
- Effects:
  - the package has **no runtime dependencies**;
  - the tarball is about 7 MB, so the npx download drops from about 36 MB to 7 MB;
  - `install` simply copies `dist/`;
  - `resolvePdfjsRoot` goes away.
- Bolt 014's package test is updated: the allowlist adds `dist/vendor/**`, and the dependencies
  are empty.
- The alternative is to keep it as it is and reword NFR-3 to exclude pdfjs-dist.

### Technical Approach

- The OS is a parameter everywhere (`platform`, `home`, `env`). That lets the macOS and Linux paths
  be unit-tested on Windows too. Real permission bits are checked only off Windows, which CI covers
  in bolt 016.
- Doctor checks are pure functions over a small "probe" interface (fs, registry query, health), so
  every failure and fix text is tested without breaking a real install.

### Acceptance Criteria

- [ ] macOS / Linux: manifest in Chrome's `NativeMessagingHosts` dir; launcher `0755` running the
  installed runtime with the install-time Node; uninstall removes both
- [ ] No admin rights, no download during install, on every OS
- [ ] `doctor` reports registration, launcher target, Node version, allowed IDs and Claude Code
  (found, logged in, version), each failure with a fix; exit 0 or 1; no personal data
- [ ] Claude not logged in → failure with the login hint; the registration checks are still shown
- [ ] `pnpm release:pack` produces the store zip and the host tarball; it fails with the reason on
  a version mismatch, a missing store ID or the placeholder repository
- [ ] Setup check warns (non-blocking) on a major or minor version mismatch; a patch difference
  gives no warning
