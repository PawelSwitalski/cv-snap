---
stage: test
bolt: 016-ci-and-release-docs
created: 2026-10-29T21:40:00Z
---

## Test Report: ci-and-release-docs

### Summary

- **Tests**: 1,062 passed, 1 skipped (`pnpm test`), 22 new in this bolt. The skipped one is the
  real shell-launcher test, which runs off Windows (CI).
- **Coverage**: 95% (unchanged).
- **Typecheck, lint, Prettier**: clean.
- **The drift tests catch drift**: three documents were broken one at a time and each break failed
  its test, then the files were restored:
  - a reworded in-app point in the Polish policy;
  - `activeTab` renamed to `tabs` in the listing;
  - a reworded error text in the README.
- **`pnpm release:pack`**: now refuses for one reason only, the unset store ID. The repository is
  `PawelSwitalski/cv-snap`.
- **CI workflow**: not run locally (it would replace this machine's real registration and delete
  its logs). Its steps are the commands covered by the commands, e2e and package tests; it runs on
  the first push.
- **Manual check**: ✅ passed (user, 2026-10-29T22:00:00Z)

### Test Files

- [x] `scripts/release-docs.test.mjs`:
  - license: MIT text with author and year; the host copy is identical; MIT in every
    `package.json`;
  - notices:
    - up to date with `node_modules`;
    - list zod and pdf.js (host) and every direct extension dependency;
    - every package has a license;
    - shipped next to the font license and in the host package;
  - privacy policy (EN, PL):
    - carries the in-app notice version and a date;
    - quotes every in-app point word for word;
    - names the contact and the deletion command;
  - README (EN, PL):
    - every troubleshooting row quotes a real error text;
    - all six setup problems are covered;
    - user part before development, no "early development", Polish link.
- [x] `extension/src/build/store-listing.test.ts`:
  - each short description is the manifest's `extDescription` and ≤ 132 characters;
  - names and full descriptions are present in both languages;
  - the justified permissions are exactly the store build's (including the optional host
    permission), each with a real justification;
  - single purpose, data-use certifications, privacy link, five 1280×800 screenshots.
- [x] `native-host/src/cli/doctor.test.ts`, `commands.test.ts`, `route.test.ts`: `--skip-claude`
  leaves out the Claude checks without calling Claude Code, prints that it did, and is accepted
  only by `doctor`.
- [x] `extension/src/lib/i18n/error-messages.test.ts`: the missing-host fix names
  `npx cv-snap-host install`; the lost-host fix names `npx cv-snap-host doctor`; neither mentions
  pnpm (PL and EN).
- [x] `native-host/test/package.test.ts`: the tarball also allows `THIRD-PARTY-NOTICES.md`.

### Acceptance Criteria Validation

**Story 001-ci-three-os**
- ✅ **Ubuntu runs typecheck, lint, format, all tests and both builds** (`check` job)
- ✅ **Install job on Windows, macOS, Ubuntu: pack → install → doctor (registration) → uninstall**
  (`install` job, with `doctor --skip-claude`, tested)
- ✅ **Tarball matches the allowlist** (package.test runs in `pnpm test` on CI)
- ✅ **Any failure fails the job** (every step exits non-zero on failure; the post-uninstall
  checks exit 1 explicitly)
- ⏳ **Edge: runs once the repository is on GitHub**: verified on the first push (Operations)

**Story 002-mit-license**
- ✅ **`LICENSE` (MIT, author, year) at the root and in the host package** (release-docs.test,
  package.test)
- ✅ **Noto Sans OFL notice kept** (release-docs.test)
- ✅ **`license` fields MIT** (release-docs.test, package.test)
- ✅ **Edge: bundled third-party code → notices shipped** (release-docs.test)

**Story 003-end-user-readme**
- ✅ **Prerequisites, store install, `npx cv-snap-host install`, first run, uninstall, privacy
  summary with link** (README, release-docs.test)
- ✅ **Troubleshooting per setup error, mentions `doctor`** (release-docs.test)
- ✅ **No "early development"; development setup below** (release-docs.test)
- ✅ **Edge: Polish users** (`README.pl.md`, tested like the English one)

**Story 004-privacy-policy-page**
- ✅ **Anthropic, no servers or telemetry, local storage and deletion, contact** (policy,
  release-docs.test)
- ✅ **Same as the in-app notice and the listing answers (NFR-2)** (word-for-word test; the listing
  links to the same version)
- ✅ **EN and PL, dated, versioned; served from `docs/`** (release-docs.test; Pages is enabled in
  Operations)
- ✅ **Edge: notice changes → versions bumped together** (the version test fails otherwise)

**Story 005-store-listing-texts**
- ✅ **PL and EN name, short (≤ 132) and full description, single purpose** (store-listing.test)
- ✅ **Every permission justified** (store-listing.test, compared with the manifest)
- ✅ **Data-use answers match the policy** (store-listing.test, listing links policy version 1)
- ✅ **Five 1280×800 screenshots planned** (store-listing.test)
- ✅ **Edge: short description over 132 characters → a test fails** (store-listing.test)

### Issues Found

- None in the code. Two wording fixes during writing:
  - the deletion section no longer suggests that uploading a new CV deletes data;
  - two gendered Polish phrasings in `README.pl.md` became neutral.

### Manual check (✅ passed, user)

1. Read `README.md`, `docs/privacy/index.md` and `store/listing.md`, and the Polish versions if
   you like. Is anything wrong, missing or not how you'd say it?
2. `pnpm build`, reload the extension, and stop the host (or open the panel without it): the setup
   hint now says `npx cv-snap-host install`.
