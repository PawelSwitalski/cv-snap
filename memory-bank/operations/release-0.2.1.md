---
release: 0.2.1
intents: [004-application-history, 005-own-cv-in-history]
created: 2026-11-04T20:40:00Z
updated: 2026-11-04T19:25:00Z
status: built
---

# Release 0.2.1

0.2.0 (application history) plus intent 005: **save your own CV to history** and **history-only
mode** for users without the helper. It replaces 0.2.0 in the store before 0.2.0 went public.
Environments, rollback and monitoring are as for 0.1.0: see `release-readiness.md` and
`monitoring.md`.

**Replaces 0.2.0 in the store** (user, 2026-11-04): the trusted-tester review of 0.2.0 is cancelled
in the Developer Dashboard and 0.2.1 is submitted instead. Already published and kept as they are:
`cv-snap-host@0.2.0` on npm (`latest` and `next`) and the GitHub Release `v0.2.0`. That release
gets a note pointing to 0.2.1.

**Host**: the code is unchanged since 0.2.0. Its version is 0.2.1 only because `release:pack`
requires matching versions. The health check compares major.minor, so a 0.2.0 helper works with
the 0.2.1 extension, and users don't need to reinstall it.

**Compatibility**:

- History entries and backups from 0.2.0 are read unchanged. Entries without a source show as
  "Tailored".
- 0.2.0 reads 0.2.1 backups that have a profile; own-CV entries then show as tailored.
- 0.2.0 refuses a **backup without a profile** (history-only mode). This goes in the release notes.
- The privacy notice stays at version 2 with updated text; the policy text is dated 4 November 2026.

## Progress

- [x] **Checkpoint 1: Build**
  - [x] Versions 0.2.1: `extension`, `native-host` (+ `HOST_VERSION`), `shared`
  - [x] Typecheck, lint, format, `pnpm test` green locally (1412 tests); `pnpm test:e2e` 3/3 at `e569804`
  - [x] Push `main` (user), CI 41879646305 green on attempt 3 (check, e2e incl. the new history-only test, install on Windows, macOS, Ubuntu)
  - [x] `pnpm release:pack` → `release/` (store zip + host tarball); tag `v0.2.1` on `860fc7e` (local, user pushes)
- [ ] **Dev + verify** (user, on the tester build or unpacked): the 0.2.0 checks, plus:
  - [ ] Save my CV to history on a real job board: stored CV and Choose another PDF…; title/company prefilled; "Your CV" in History; replace prompts in both directions
  - [ ] History-only mode on a second Chrome profile without the helper registered (or with the native-host manifest renamed): Use without the helper → add CV → save → reopen the panel
  - [ ] Set up the helper later from history-only mode → Create my profile from my CV → Generate
  - [ ] Backup in history-only mode → import on a third clean profile → history-only home with the entries
- [ ] **Checkpoint 2: Staging**: cancel the 0.2.0 review in the Developer Dashboard; upload `cv-snap-0.2.1-chrome-release.zip` (trusted testers; review); `npm publish ./release/cv-snap-host-0.2.1.tgz --tag next`
- [ ] **Checkpoint 3: Production**: publish the store item (public); `npm dist-tag add cv-snap-host@0.2.1 latest`; GitHub Release `v0.2.1` as Latest (notes: 0.2.0 features + own CV + history-only + the backup compatibility note); note on `v0.2.0`
- [ ] **Checkpoint 4: Monitoring**: as in `monitoring.md`; also watch reports from history-only users and backup sizes

## Log

| Date | Event |
|---|---|
| 2026-11-04 | Intent 005 built (bolts 028–030); release planned as 0.2.1, replacing 0.2.0's store review (user) |
| 2026-11-04 | Versions set to 0.2.1 (host too: `release:pack` requires equal versions); locally green: 1412 tests, typecheck, lint, format |
| 2026-11-04 | Push (user); CI 41879646305: Windows install failed twice on runner image `windows-2025-vs2026` 20261103.298.1 (helper PDF and registry tests ~10× slower, timeouts); green on attempt 3 on image 20261030.294.1. Helper code unchanged since 0.2.0; all 236 helper tests pass locally on Windows. Watch: the new image may fail CI again until GitHub fixes it |
| 2026-11-04 | Packed: zip 0.2.1, no `key`, permissions and CSP unchanged (no build-config change since `v0.2.0`); host tarball 0.2.1; tag `v0.2.1` on `860fc7e` |

## Artifacts (tag v0.2.1, commit 860fc7e)

| File | Size | SHA-256 |
|---|---|---|
| `release/cv-snap-0.2.1-chrome-release.zip` | 1,842,430 B | `5327741e334ae893828ab53dc066977a0d473538cb3870c8afc44dd5cf6b1b62` |
| `release/cv-snap-host-0.2.1.tgz` | 2,794,467 B | `984ee54516e23c91353e32be40c7e394acd765fd51cfe01c36039a66ca8d9952` |
