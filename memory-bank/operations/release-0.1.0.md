---
release: 0.1.0
intents: [001-one-click-tailored-cv, 002-release-readiness]
created: 2026-10-30T17:45:00Z
updated: 2026-10-30T17:45:00Z
status: build
---

# Release 0.1.0

Environments, rollback and monitoring: see `release-readiness.md`.

## Progress

- [ ] **Checkpoint 1: Build**
  - [x] GitHub repository public (`PawelSwitalski/cv-snap`), `main` pushed
  - [x] GitHub Pages on (`main` `/docs`); privacy policy online (EN, PL)
  - [x] CI green on Windows, macOS, Ubuntu (after fix bolt 017; actions on Node 24)
  - [ ] Chrome Web Store developer account (user)
  - [ ] Store zip uploaded as a **draft** (not submitted) → store item ID (user)
  - [ ] `STORE_EXTENSION_ID` set in `shared/src/extension-identity.ts`, CI green
  - [ ] `pnpm release:pack` → `release/` (store zip + host tarball); tag `v0.1.0`
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
