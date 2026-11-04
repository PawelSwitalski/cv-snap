---
release: 0.1.1
intents: [003-complete-cv-content]
created: 2026-11-02T22:20:00Z
updated: 2026-11-04T12:10:00Z
status: superseded
---

# Release 0.1.1

**Superseded by 0.2.0** (user, 2026-11-04): a tester-only build; Checkpoints 2–4 are not done for 0.1.1. Its fixes ship in 0.2.0 (`release-0.2.0.md`).

Defect release: the tailored CV keeps every education entry and every profile skill, and can
include relevant other sections. Both packages change (the tailoring prompt is built in the host).
Environments, rollback and monitoring as for 0.1.0: see `release-readiness.md` and `monitoring.md`.

**Compatibility**: the health check compares major.minor only, so 0.1.0 and 0.1.1 work together
in either direction (a 0.1.0 host gives plans without other sections; a 0.1.0 extension ignores
them).

## Progress

- [x] **Checkpoint 1: Build**
  - [x] Versions 0.1.1: `extension`, `native-host` (+ `HOST_VERSION`), `shared`; host tests use `HOST_VERSION` instead of a literal
  - [x] Push `main` (user), CI green on Windows, macOS, Ubuntu (41510560200; macOS re-run after a runner-queue cancel)
  - [x] `pnpm release:pack` → `release/` (store zip + host tarball); tag `v0.1.1` on `2955ba8` (local, user pushes)
- [x] **Dev + verify** (user, clean Chrome profile, dev build + host from the release tarball)
  - [x] Ad that doesn't mention education: every school and every skill in the preview and the PDF
  - [x] Profile with a relevant other section (course, volunteering): it appears; PDF looks right
  - [x] Long CV: "left out" list shows sections/skills as expected; PDF ≤ 2 pages
  - [x] Download PDF works (store-style build, regression of bolt 019)
- [ ] **Checkpoint 2: Staging**: upload the zip to the store item (trusted testers stay; review); `npm publish ./release/cv-snap-host-0.1.1.tgz --tag next`; verify with store install + `npx cv-snap-host@next install`
- [ ] **Checkpoint 3: Production**: publish the store update (public); `npm dist-tag add cv-snap-host@0.1.1 latest`; GitHub Release `v0.1.1`; verify as a non-tester
- [ ] **Checkpoint 4: Monitoring**: weekly check (`monitoring.md`)

## Log

| Date | Event |
|---|---|
| 2026-11-02 | Intent 003 built (bolts 020, 021); versions set to 0.1.1; tests 1162 passed |
| 2026-11-02 | Pushed (user); CI 41510560200: macOS job cancelled after 15 min in the runner queue (no step ran), re-run green; all three OSes green |
| 2026-11-02 | Packed: zip 0.1.1, no `key`, CSP with `wasm-unsafe-eval`; host tarball 0.1.1; tag `v0.1.1` on `2955ba8` |
| 2026-11-03 | Dev verified (user): all four checks pass (education + skills kept, other sections, long CV ≤ 2 pages, Download PDF) |
| 2026-11-03 | npm: first publish 404 (expired login, nothing published); after `npm login`, `cv-snap-host@0.1.1` published with `--tag next` (user). Registry integrity matches the local tarball; `latest` stays 0.1.0 |
| 2026-11-04 | Superseded by 0.2.0 (user): not promoted beyond trusted testers; host 0.1.1 stays on npm `next` until 0.2.0 |

## Artifacts (tag v0.1.1, commit 2955ba8)

| File | Size | SHA-256 |
|---|---|---|
| `release/cv-snap-0.1.1-chrome-release.zip` | 1,815,429 B | `ca0c7cdedf02b905155faffb75f59487888499bf3869be207fe8a92018e7e01e` |
| `release/cv-snap-host-0.1.1.tgz` | 2,821,744 B | `6df9105ce08dfb751f00705960e23b7e14ddebffe93df0ffd8eda3e94a123fe0` |
