---
release: 0.1.0
intents: [001-one-click-tailored-cv, 002-release-readiness]
created: 2026-10-30T17:45:00Z
updated: 2026-10-31T09:50:00Z
status: build
---

# Release 0.1.0

Environments, rollback and monitoring: see `release-readiness.md`.

## Progress

- [x] **Checkpoint 1: Build**
  - [x] GitHub repository public (`PawelSwitalski/cv-snap`), `main` pushed
  - [x] GitHub Pages on (`main` `/docs`); privacy policy online (EN, PL)
  - [x] CI green on Windows, macOS, Ubuntu (after fix bolt 017; actions on Node 24)
  - [x] Chrome Web Store developer account (user)
  - [x] Store zip uploaded as a **draft** (not submitted) → store item ID `oginbbblfjbbccigemfeiimdlfeibjja` (user)
  - [x] `STORE_EXTENSION_ID` set in `shared/src/extension-identity.ts` (`cae1b58`), CI green (41111403017)
  - [x] `pnpm release:pack` → `release/` (store zip + host tarball); tag `v0.1.0` on `cae1b58`
  - [x] npm login (user: `pawel-switalski`)
- [ ] **Dev + verify**: dev build in a clean Chrome profile + host from the release tarball
- [ ] **Checkpoint 2: Staging**: CWS trusted testers; `npm publish --tag next`; verify
- [ ] **Checkpoint 3: Production**: public listing; npm `latest`; verify
- [ ] **Checkpoint 4: Monitoring**: checklist

## Log

| Date | Event |
|---|---|
| 2026-10-30 | Repository created by the user; first CI run (41084773775) failed on macOS and Ubuntu → fix bolt 017 |
| 2026-10-30 | CI green on all three OSes (41087387628); actions moved to Node 24 majors (`8922579`) |
| 2026-10-30 | Store zip for the draft upload: `extension/.output/cv-snap-0.1.0-chrome-release.zip`, 1.81 MB, no `key`, built from `bf3f3dd` |
| 2026-10-30 | Store draft created by the user; ID `oginbbblfjbbccigemfeiimdlfeibjja`; `cv-snap-host` still free on npm |
| 2026-10-30 | Store ID set (`cae1b58`), CI green (41111403017); `release:pack` passed all checks |
| 2026-10-30 | Packed: `cv-snap-0.1.0-chrome-release.zip` 1.73 MB; `cv-snap-host-0.1.0.tgz` 2.69 MB; tag `v0.1.0` pushed |
| 2026-10-30 | Dev check (user): the toolbar icon only closed and reopened the panel; "Add this site" never appeared → fix bolt 018 (manual check passed) |
| 2026-10-30 | Fix `f731d17` pushed, CI green (41131863932); re-packed: new store zip, host tarball unchanged (byte-identical) |
| 2026-10-31 | Dev check (user): Download PDF failed ("The PDF couldn't be prepared"); Chrome's default extension CSP blocked react-pdf's WebAssembly, hidden by `pnpm dev` → fix bolt 019 (manual check passed: PDF downloaded) |

## Artifacts (commit f731d17)

| File | Size | SHA-256 |
|---|---|---|
| `release/cv-snap-0.1.0-chrome-release.zip` | 1,814,377 B | `1d2e7c6794d9d0dd1af0ba8fb02ad9548e7867b6bfff6ae492e738be21dfc2be` |
| `release/cv-snap-host-0.1.0.tgz` | 2,821,477 B | `8b3581a3e2d0884bcf13b2a827995537fcdc159016a9fe0348dade5700074e39` |

The store zip replaces the draft's first upload (`b6189d7b…`, built before fix bolt 018). The
host tarball is byte-identical to the `cae1b58` pack: bolt 018 changed the extension only.
