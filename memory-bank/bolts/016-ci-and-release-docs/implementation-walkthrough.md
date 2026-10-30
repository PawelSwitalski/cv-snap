---
stage: implement
bolt: 016-ci-and-release-docs
created: 2026-10-29T21:10:00Z
---

## Implementation Walkthrough: ci-and-release-docs

### Summary

cv-snap now has what a public release needs besides the code:
- a CI workflow for all three OSes;
- the MIT license with generated third-party notices;
- a README for end users, in English and Polish;
- a privacy policy for GitHub Pages, in English and Polish, that quotes the in-app notice;
- the Chrome Web Store listing texts.

The in-app setup hints now name the user commands (`npx cv-snap-host install` / `doctor`).

### Structure Overview

- **Documents:** in their public places: `README*.md`, `docs/privacy/` (GitHub Pages) and
  `store/listing.md`.
- **Generated notices:** `scripts/third-party-notices.mjs` walks the production dependency tree
  from `node_modules` and writes one notices file per shipped artefact.
- **CI:** reuses the real user commands on the packed tarball.

### Completed Work

- [x] `.github/workflows/ci.yml`:
  - `check` on Ubuntu: build, typecheck, lint, format, all tests, store zip;
  - `install` on Windows, macOS and Ubuntu: host tests, pack, then `npx <tgz>` `--version` →
    `install` → `doctor --skip-claude` → `uninstall --purge`, then a check that the registration is
    gone and that `doctor` now fails.
- [x] `native-host/src/cli/route.ts`, `doctor.ts`, `commands.ts` - `doctor --skip-claude` (leaves out the two Claude checks and says so)
- [x] `LICENSE`, `native-host/LICENSE` - MIT, Copyright (c) 2026 Paweł Świtalski
- [x] `license: "MIT"` in every `package.json`; host `files` adds `THIRD-PARTY-NOTICES.md`
- [x] `scripts/third-party-notices.mjs`, root `pnpm notices` - writes the two notices files below
- [x] `native-host/THIRD-PARTY-NOTICES.md` - pdf.js 6.4.299 (Apache-2.0), zod 4.6.7 (MIT)
- [x] `extension/public/THIRD-PARTY-NOTICES.md` - 97 packages (86 MIT, 5 ISC, 4 Apache-2.0, 1 0BSD, 1 MIT by license file); ships in the zip next to `fonts/OFL.txt`
- [x] `.prettierignore` - generated notices (compared byte for byte) and `release/`
- [x] `README.md`:
  - for users first: what it is, requirements, install, first run, privacy summary with link,
    uninstall, troubleshooting table, license;
  - "Development" below, updated for the host package, CI and release.
- [x] `README.pl.md` - the user part in Polish
- [x] `native-host/README.md` - the npm package page
- [x] `docs/privacy/index.md`, `docs/privacy/pl.md` - policy version 1, dated; quotes the four in-app points word for word; covers Anthropic, no servers or telemetry, sites read, local storage, deletion, changes, contact (GitHub Issues)
- [x] `store/listing.md`:
  - EN and PL name, short and full descriptions;
  - single purpose;
  - a justification per permission, and the remote-code answer;
  - data-use answers and certifications;
  - five screenshots.
- [x] `extension/public/_locales/{en,pl}/messages.json` - setup hints and fixes for a missing or lost host name `npx cv-snap-host install` and `doctor`
- [x] `extension/src/lib/i18n/error-messages.test.ts`, `native-host/test/package.test.ts`, route and commands tests - updated for the above

### Key Decisions

- **The listing's short description equals the manifest description**: the Chrome Web Store
  takes the summary from the manifest's `description` (here `extDescription`). The listing
  therefore reuses those texts, and the test compares them, not just their length.
- **The policy quotes the in-app notice verbatim** in its summary. NFR-2 ("they say the same
  thing") becomes a simple text check, not a judgement.
- **The troubleshooting table quotes the side panel's exact error texts**, so a test can keep the
  README in step with the UI.
- **Notices are generated and committed**: reviewable in diffs, shipped without a build-time
  network step, and checked for staleness by a test.
- **CI checks removal through `doctor` too**: after uninstall, `doctor` must fail. This proves
  both that uninstall works and that doctor detects a missing registration on each OS.
- **The workflow wasn't run here**: its install steps would replace this machine's real
  registration, and `--purge` would delete its logs. The same flow is covered by the commands
  and e2e tests; the workflow runs for real on the first push.

### Deviations from Plan

- `hint_` / `fix_HOST_DISCONNECTED` point to `doctor` (to find the cause) rather than `install`.
  A lost connection usually has a cause `doctor` names, such as a removed Node.
- Notices are committed files with a staleness test, not generated during each build: a build
  never changes tracked files that way.
- The host package README (a placeholder since bolt 014) is written.

### Dependencies Added

- None

### Developer Notes

- Repository: `https://github.com/PawelSwitalski/cv-snap` (user's GitHub account; the repository
  name `cv-snap` is assumed). The policy URL is `https://pawelswitalski.github.io/cv-snap/privacy/`
  (GitHub Pages hostnames are lowercase). The `OWNER` guard in `release:pack` stays as a safety
  net.
- The only placeholder left is the Chrome Web Store link in both READMEs ("link follows with the
  first release"); Operations adds it once the store item exists.
- To publish the policy, enable GitHub Pages in the repository settings with source `main`,
  folder `/docs`.
