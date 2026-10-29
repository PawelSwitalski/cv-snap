---
id: 001-bundled-host-package
unit: 002-host-package
intent: 002-release-readiness
status: draft
priority: must
created: 2026-10-29T16:09:23Z
assigned_bolt: 014-host-package
implemented: false
---

# Story: 001-bundled-host-package

## User Story

**As a** user
**I want** to install the host from npm without the cv-snap repository
**So that** setup is one command

## Acceptance Criteria

- [ ] **Given** the package, **When** inspected, **Then** it is `cv-snap-host` with `bin`, `files`, `engines.node >= 24`, `license: MIT`, `repository`, and no `workspace:` dependency (`shared` is bundled)
- [ ] **Given** `npm pack`, **When** listed, **Then** the tarball holds only allowlisted runtime files and docs (no tests, fixtures, memory-bank)
- [ ] **Given** an empty directory, **When** `npx ./cv-snap-host-<v>.tgz --version` runs, **Then** it prints the version
- [ ] **Given** the unpacked package, **When** measured, **Then** it is at most 15 MB (NFR-3)

## Technical Notes

- Bundle `shared` into the host build (esbuild via a small build script); `pdfjs-dist` stays a dependency

## Edge Cases

| Scenario | Expected Behavior |
|---|---|
| `pnpm run install-host` in the repo | Still works for development |
