---
release: 0.2.0
intents: [004-application-history]
created: 2026-11-04T12:10:00Z
updated: 2026-11-04T13:00:00Z
status: staging
---

# Release 0.2.0

Feature release: application history. Every downloaded CV is kept with a cleaned copy of the job
ad, a sent date, search and filters, a retention setting, and backups that include the history.
Includes the 0.1.1 fixes (complete CV content), which only trusted testers received. Environments,
rollback and monitoring as for 0.1.0: see `release-readiness.md` and `monitoring.md`.

**Supersedes 0.1.1** (user, 2026-11-04): 0.1.1 was a tester-only build and stays as it is. It is
not promoted; `cv-snap-host@0.1.1` stays on npm `next` until 0.2.0 replaces it there, and `latest`
moves from 0.1.0 straight to 0.2.0.

**Compatibility**: the health check compares major.minor, so a 0.2.0 extension needs a 0.2.x host
and the other way round. Users of 0.1.x see the existing "update the helper" message and run
`npx cv-snap-host install` once. Both packages are released together.

**Data**: the history is new storage (IndexedDB); nothing from 0.1.x is migrated or changed.
Settings from 0.1.x read as "keep forever". Backups from 0.1.x import unchanged.

## Progress

- [x] **Checkpoint 1: Build**
  - [x] Versions 0.2.0: `extension`, `native-host` (+ `HOST_VERSION`), `shared`
  - [x] Typecheck, lint, format, `pnpm test`, `pnpm test:e2e` green locally
  - [x] Push `main` (user), CI green on Windows, macOS, Ubuntu (41815435473, incl. the e2e job with the history test)
  - [x] `pnpm release:pack` → `release/` (store zip + host tarball); tag `v0.2.0` on `f812ce1` (local, user pushes)
- [ ] **Dev + verify** (user, clean Chrome profile, release build + host from the tarball)
  - [ ] Upgrade path: with the 0.1.x host still installed, the panel asks to update the helper; after `npx ./cv-snap-host-0.2.0.tgz install` it works
  - [ ] Download two CVs: both in History; the saved page opens and looks like the ad; Open PDF opens the same file
  - [ ] Mark as sent, search, filter, Delete; "already in history" hint in Generate
  - [ ] Retention: a shorter period asks before deleting; "Delete all history"
  - [ ] Backup with history of realistic size (tens of MB if possible): export (50 MB dialog if above), import on a second clean profile; entries and PDFs identical
  - [ ] Privacy notice v2 shown once to an existing user
  - [ ] 0.1.1 regression: education, skills and other sections still in the CV
- [ ] **Checkpoint 2: Staging**: upload the zip to the store item (trusted testers; review); `npm publish ./release/cv-snap-host-0.2.0.tgz --tag next`; verify with store install + `npx cv-snap-host@next install`
  - [x] Zip 0.2.0 uploaded to the store item, trusted testers only (user)
  - [ ] Store review passed
  - [ ] `npm publish ./release/cv-snap-host-0.2.0.tgz --tag next` (user)
  - [ ] Verify: store install + `npx cv-snap-host@next install`; the Dev + verify checks above run on this build
- [ ] **Checkpoint 3: Production**: publish the store update (public); `npm dist-tag add cv-snap-host@0.2.0 latest`; GitHub Release `v0.2.0`; verify as a non-tester
- [ ] **Checkpoint 4: Monitoring**: weekly check (`monitoring.md`); watch for backup size or import reports (ZIP format deferred until real-usage feedback)

## Log

| Date | Event |
|---|---|
| 2026-11-04 | Intent 004 built (bolts 022–027); 1340 tests, e2e 2/2; release planned as 0.2.0, 0.1.1 superseded (user) |
| 2026-11-04 | Versions set to 0.2.0; locally green: 1340 tests, e2e 2/2 (fresh build), typecheck, lint, format |
| 2026-11-04 | Push: first attempt rejected by GitHub (500, nothing applied), retry ok (user); CI 41815435473 green (check, e2e, install on Windows, macOS, Ubuntu) |
| 2026-11-04 | Packed: zip 0.2.0, no `key`, CSP with `wasm-unsafe-eval`, permissions unchanged since 0.1.x; host tarball 0.2.0; tag `v0.2.0` on `f812ce1` |
| 2026-11-04 | Tag `v0.2.0` and `main` pushed (user); zip 0.2.0 uploaded to the store for trusted testers (user); the manual checks run on the tester build instead of a separate unpacked install |

## Artifacts (tag v0.2.0, commit f812ce1)

| File | Size | SHA-256 |
|---|---|---|
| `release/cv-snap-0.2.0-chrome-release.zip` | 1,834,950 B | `a02a4693335ae342648403dcfe068742d31e2b53c575d80f0a0908a2b3bc055d` |
| `release/cv-snap-host-0.2.0.tgz` | 2,794,467 B | `c9dc1061436568045480457d987edcd485587904a27df676de7567d1499d988e` |
