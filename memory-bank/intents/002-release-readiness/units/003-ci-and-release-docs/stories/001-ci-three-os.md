---
id: 001-ci-three-os
unit: 003-ci-and-release-docs
intent: 002-release-readiness
status: draft
priority: must
created: 2026-10-29T16:09:23Z
assigned_bolt: 016-ci-and-release-docs
implemented: false
---

# Story: 001-ci-three-os

## User Story

**As a** maintainer
**I want** every push checked on Windows, macOS and Linux
**So that** a release never breaks one platform unnoticed

## Acceptance Criteria

- [ ] **Given** a push or pull request, **When** CI runs, **Then** Ubuntu runs typecheck, lint, format check, all tests and both builds
- [ ] **Given** the same run, **When** the install job runs on Windows, macOS and Ubuntu, **Then** it packs the host and runs `install` → `doctor` (registration checks) → `uninstall` on the tarball
- [ ] **Given** the tarball, **When** CI lists it, **Then** it matches the allowlist (NFR-1)
- [ ] **Given** any failure, **When** it happens, **Then** the job fails

## Technical Notes

- GitHub Actions; Claude Code isn't on runners, so `doctor` runs with a flag that skips the Claude checks

## Edge Cases

| Scenario | Expected Behavior |
|---|---|
| Repository not on GitHub yet | Workflow is committed and runs as soon as the repository is pushed |
