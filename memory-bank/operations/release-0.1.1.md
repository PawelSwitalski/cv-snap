---
release: 0.1.1
intents: [003-complete-cv-content]
created: 2026-11-02T22:20:00Z
updated: 2026-11-02T22:20:00Z
status: build
---

# Release 0.1.1

Defect release: the tailored CV keeps every education entry and every profile skill, and can
include relevant other sections. Both packages change (the tailoring prompt is built in the host).
Environments, rollback and monitoring as for 0.1.0: see `release-readiness.md` and `monitoring.md`.

**Compatibility**: the health check compares major.minor only, so 0.1.0 and 0.1.1 work together
in either direction (a 0.1.0 host gives plans without other sections; a 0.1.0 extension ignores
them).

## Progress

- [ ] **Checkpoint 1: Build**
  - [x] Versions 0.1.1: `extension`, `native-host` (+ `HOST_VERSION`), `shared`; host tests use `HOST_VERSION` instead of a literal
  - [ ] Push `main`, CI green on Windows, macOS, Ubuntu
  - [ ] `pnpm release:pack` → `release/` (store zip + host tarball); tag `v0.1.1`
- [ ] **Dev + verify** (user, clean Chrome profile, dev build + host from the release tarball)
  - [ ] Ad that doesn't mention education: every school and every skill in the preview and the PDF
  - [ ] Profile with a relevant other section (course, volunteering): it appears; PDF looks right
  - [ ] Long CV: "left out" list shows sections/skills as expected; PDF ≤ 2 pages
  - [ ] Download PDF works (store-style build, regression of bolt 019)
- [ ] **Checkpoint 2: Staging**: upload the zip to the store item (trusted testers stay; review); `npm publish ./release/cv-snap-host-0.1.1.tgz --tag next`; verify with store install + `npx cv-snap-host@next install`
- [ ] **Checkpoint 3: Production**: publish the store update (public); `npm dist-tag add cv-snap-host@0.1.1 latest`; GitHub Release `v0.1.1`; verify as a non-tester
- [ ] **Checkpoint 4: Monitoring**: weekly check (`monitoring.md`)

## Log

| Date | Event |
|---|---|
| 2026-11-02 | Intent 003 built (bolts 020, 021); versions set to 0.1.1; tests 1162 passed |
