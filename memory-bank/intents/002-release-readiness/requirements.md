---
intent: 002-release-readiness
phase: inception
status: complete
created: '2026-10-29T15:56:47Z'
updated: '2026-10-29T16:11:41Z'
---

# Requirements: Release Readiness

## Intent Overview

cv-snap works end to end from a developer checkout (intent 001), but it can't yet be installed
the way real users will install it: the extension from the Chrome Web Store and the native host
with `npx cv-snap-host install`. This intent closes the gaps found in
`memory-bank/operations/release-readiness.md` so Operations can build, stage and publish 0.1.0.

**Type**: Infrastructure / release engineering (brown-field)

### In Scope
- Store-ready extension build: no dev `key`, host accepts the store and dev extension IDs, icons
- Publishable host package `cv-snap-host`: `shared` bundled, `files`/`engines`/MIT,
  `npx cv-snap-host install | uninstall | doctor` routed apart from the host, runtime copied to a
  stable directory
- Host registration on Windows, macOS and Linux, with CI install tests on all three
- Release documents: LICENSE (MIT), end-user README, privacy policy page, CWS listing texts (PL/EN)
  with permission justifications and data-use disclosures

### Out of Scope
- Publishing itself (accounts, uploads, store review): Operations, done by the user
- New product features; the direct Anthropic API provider
- Browsers other than Chrome (Edge, Brave, Chromium)

### Decisions (2026-10-29)
- Platforms: Windows, macOS, Linux; browser: **Chrome only**
- License: MIT
- Staging: CWS trusted testers + npm `next` dist-tag
- Home: a **public GitHub repository** (CI on GitHub Actions, privacy policy on GitHub Pages). The
  user creates it, and its URL fills the placeholders.
- Extension ID: the host trusts **both** the dev ID and the store ID; the store build has no `key`
- Icon: designed in this intent (an SVG mark rendered to PNG sizes); replaceable later

### Assumptions (adjustable)
- Users need Node.js ≥ 24 for `npx` (Claude Code users usually have it). A standalone host binary
  is a later intent.
- The extension and the host share one version (0.1.0) and are released together.
- The user takes the listing screenshots from the built extension.
- Uninstall removes the host and its registration; logs stay unless `--purge` is given.

## Functional Requirements

### FR-1: Store build without the dev key
- **Description**: The release build of the extension omits the manifest `key`, so the Chrome Web
  Store can assign its own ID. Development builds keep the dev key (stable dev ID).
- **Acceptance Criteria**: The release manifest has no `key` and is otherwise identical to the dev
  manifest (name, version, permissions, icons); a test checks both builds' manifests; a release zip
  is produced for upload.
- **Priority**: Must

### FR-2: Host trusts the store and dev extension IDs
- **Description**: The native host manifest's `allowed_origins` lists the store extension ID and the
  dev extension ID, and nothing else. The store ID is defined once in `shared`, next to the dev ID.
- **Acceptance Criteria**: `allowed_origins` contains exactly the two origins; the installer prints
  both IDs; until the store ID is set, the release build refuses to produce a package, so no
  placeholder ID can ship.
- **Priority**: Must

### FR-3: Extension icons
- **Description**: One SVG mark, rendered to 16, 32, 48 and 128 px PNGs and used as the extension
  icons and the toolbar action icon.
- **Acceptance Criteria**: The manifest has `icons` and `action.default_icon` for all four sizes;
  the icon stays recognisable at 16 px on light and dark toolbars; the 128 px icon follows the CWS
  guideline (96×96 artwork with 16 px transparent padding).
- **Priority**: Must

### FR-4: Publishable host package `cv-snap-host`
- **Description**: The native host is published to npm as `cv-snap-host`, with `shared` bundled in,
  so it installs without the monorepo.
- **Acceptance Criteria**:
  - `package.json` has `name: cv-snap-host`, a `bin` entry, `files` limited to the runtime and
    docs, `engines.node >= 24`, `license: MIT` and `repository`, and no `workspace:` dependencies.
  - `npm pack` produces a tarball whose file list has no tests, fixtures or memory-bank files.
  - `npx <tarball> --version` works in an empty directory.
- **Priority**: Must

### FR-5: One command for users and Chrome
- **Description**: `cv-snap-host install | uninstall | doctor | --version | --help` are user
  commands. When Chrome starts the program (first argument is a `chrome-extension://` origin), it
  runs the native host.
- **Acceptance Criteria**: Each subcommand works as documented; unknown arguments print usage and
  exit with code 2; in host mode nothing but protocol frames reaches stdout (existing rule).
- **Priority**: Must

### FR-6: Install to a stable per-user location
- **Description**: `install` copies the host runtime into a per-user directory and points the
  launcher there, so clearing the npx cache never breaks the host:
  - Windows: `%LocalAppData%\cv-snap\host`
  - macOS: `~/Library/Application Support/cv-snap/host`
  - Linux: `~/.local/share/cv-snap/host`
- **Acceptance Criteria**:
  - After `install`, deleting the npx cache leaves the host working (the health check passes).
  - Re-running `install` with a newer version upgrades in place.
  - `uninstall` removes the runtime, launcher, manifest and registration; logs stay unless
    `--purge`.
- **Priority**: Must

### FR-7: `doctor` command
- **Description**: Checks the whole setup and prints a fix for each problem.
- **Acceptance Criteria**:
  - It reports:
    - the registration (registry value or manifest file);
    - that the launcher points to an existing runtime;
    - the Node version;
    - the allowed extension IDs;
    - whether Claude Code is found and logged in, and its version (the existing health check).
  - It exits with 0 when everything passes and 1 otherwise.
  - It prints no personal data.
- **Priority**: Should

### FR-8: Registration on macOS and Linux
- **Description**: On macOS and Linux, `install` writes the host manifest into Chrome's
  `NativeMessagingHosts` directory, plus a launcher shell script. Windows keeps the HKCU registry
  value.
- **Acceptance Criteria**:
  - macOS: `~/Library/Application Support/Google/Chrome/NativeMessagingHosts/`
  - Linux: `~/.config/google-chrome/NativeMessagingHosts/`
  - The launcher is executable (0755) and runs the installed runtime with the Node that ran
    `install`.
  - `uninstall` removes both the manifest and the launcher.
  - No step needs admin rights.
- **Priority**: Must

### FR-9: Continuous integration on three OSes
- **Description**: GitHub Actions runs on every push and pull request.
- **Acceptance Criteria**:
  - Ubuntu runs typecheck, lint, format check, all tests and both builds.
  - Windows, macOS and Ubuntu each pack the host and run `install` → `doctor` (registration checks)
    → `uninstall` against the packed tarball.
  - The job fails on any error.
- **Priority**: Must

### FR-10: License
- **Description**: MIT license for the project.
- **Acceptance Criteria**: `LICENSE` (MIT, with the author's name and year) at the root and in the
  host package; the bundled Noto Sans fonts keep their OFL notice; `license` fields are set in the
  published packages.
- **Priority**: Must

### FR-11: End-user README
- **Description**: The README explains how to install and use cv-snap as a user. The development
  setup stays, below that.
- **Acceptance Criteria**:
  - It covers:
    - prerequisites (Chrome, Node ≥ 24, Claude Code logged in);
    - installing from the store, then `npx cv-snap-host install`;
    - the first run;
    - troubleshooting: one entry per setup error with its fix, and `doctor`;
    - uninstalling;
    - a privacy summary linking the policy.
  - The "early development" status line is gone.
- **Priority**: Must

### FR-12: Privacy policy page
- **Description**: A public privacy policy in English and Polish, served by GitHub Pages from the
  repository.
- **Acceptance Criteria**:
  - It states:
    - what is sent to Anthropic: the CV profile and job ad, through the user's own Claude Code,
      under their Claude terms;
    - that cv-snap has no servers and collects no telemetry;
    - what is stored locally, and how to delete it (uninstall, export/import);
    - a contact.
  - It is consistent with the in-app privacy notice, and dated with a version.
- **Priority**: Must

### FR-13: Chrome Web Store listing texts
- **Description**: Everything the CWS form needs, kept in the repository.
- **Acceptance Criteria**:
  - PL and EN name, short description (≤ 132 characters) and full description.
  - The single-purpose statement.
  - A justification for each permission: `storage`, `unlimitedStorage`, `nativeMessaging`,
    `scripting`, `sidePanel`, `activeTab`, and the optional `https://*/*`.
  - The data-use disclosure answers: personal info (CV contents), not sold, not used for unrelated
    purposes.
  - The list of screenshots to take (1280×800) and what each shows.
- **Priority**: Must

### FR-14: Release packing and version check
- **Description**: One command prepares both packages for a release.
- **Acceptance Criteria**: `pnpm release:pack` builds the extension zip and the host tarball, and
  fails if their versions differ or the store ID is missing; the setup check warns when the host
  and extension versions differ in major or minor.
- **Priority**: Should

## Non-Functional Requirements

### NFR-1: Security
- **Requirement**:
  - `allowed_origins` lists only the two cv-snap IDs.
  - The installer writes only per-user locations, needs no admin rights and makes no network
    requests.
  - The published tarball contains only reviewed runtime files; CI checks it against an
    allowlist.

### NFR-2: Privacy
- **Requirement**: No telemetry or network calls are added; the privacy policy, the in-app notice
  and the listing's data-use answers say the same thing.

### NFR-3: Size
- **Requirement**: Extension zip ≤ 10 MB; host tarball ≤ 15 MB unpacked (pdfjs-dist included).

### NFR-4: Reliability
- **Requirement**: `install` and `uninstall` are idempotent. An upgrade keeps the host working,
  with only an extension reload needed. A failed install leaves the previous installation working.

### NFR-5: Compatibility
- **Requirement**: Node ≥ 24; Chrome stable; Windows 10/11, macOS 13+, Ubuntu 22.04+ (CI runners as
  the reference).
