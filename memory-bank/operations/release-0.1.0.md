---
release: 0.1.0
intents: [001-one-click-tailored-cv, 002-release-readiness]
created: 2026-10-30T17:45:00Z
updated: 2026-10-31T19:05:00Z
status: staging
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
  - [x] `pnpm release:pack` → `release/` (store zip + host tarball); tag `v0.1.0` on `e9ca4ab` (moved from `cae1b58` after fix bolts 018 and 019)
  - [x] npm login (user: `pawel-switalski`)
- [x] **Dev + verify**: dev build in a clean Chrome profile + host from the release tarball (user, 2026-10-31; found and fixed bolts 018, 019)
- [ ] **Checkpoint 2: Staging**: CWS trusted testers; `npm publish --tag next`; verify
  - [x] Store listing, privacy practices (PII + website content; 3 certifications; remote code: No), 5 screenshots (1280×800, address bar and company blurred), visibility Private → trusted testers (user)
  - [x] Submitted for review 2026-10-31 (user); publisher contact email set and verified
  - [ ] Review passed
  - [x] `npm publish ./release/cv-snap-host-0.1.0.tgz --tag next` (user, 2026-10-31): shasum `606e0fc1…` matches the tarball, 207 files; `npx cv-snap-host@next --version` → 0.1.0
  - [ ] Verify: store install in a clean profile + host, `doctor`, Add this site, Generate CV, Download PDF
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
| 2026-10-31 | Fix `e9ca4ab` pushed, CI green (41186085304); re-packed: new store zip (CSP verified in its manifest, no `key`), host tarball unchanged; tag `v0.1.0` to move from `cae1b58` to `e9ca4ab` (user runs the force-push) |
| 2026-10-31 | Tag `v0.1.0` moved to `e9ca4ab` (user); new store zip uploaded to the draft (user); dev check complete; `npm publish --dry-run --tag next` passed (207 files, 2.8 MB) |
| 2026-10-31 | Store item submitted for review (trusted testers); publisher contact email set and verified; screenshots kept outside the repo |
| 2026-10-31 | First `npm publish` failed: login session expired (401, shown as 404), then 2FA could not complete through the `!` prompt; published from the user's PowerShell |
| 2026-10-31 | npm staged publishing: placeholder `0.0.0-stage` for ~2 min, then `cv-snap-host@0.1.0` released; dist-tags `latest` and `next` = 0.1.0 (npm sets `latest` on a first version) |

## Artifacts (tag v0.1.0, commit e9ca4ab)

| File | Size | SHA-256 |
|---|---|---|
| `release/cv-snap-0.1.0-chrome-release.zip` | 1,814,506 B | `ebc7461faf5216888b116b3e7c805afeadc6439032d8c1350b41d80bb6efd8ca` |
| `release/cv-snap-host-0.1.0.tgz` | 2,821,477 B | `8b3581a3e2d0884bcf13b2a827995537fcdc159016a9fe0348dade5700074e39` |

The store zip replaces the draft's first upload (`b6189d7b…`, built before fix bolts 018 and 019). The
host tarball is byte-identical to the `cae1b58` pack: bolts 018 and 019 changed the extension only.
