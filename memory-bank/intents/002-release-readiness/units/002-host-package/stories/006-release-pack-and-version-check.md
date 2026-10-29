---
id: 006-release-pack-and-version-check
unit: 002-host-package
intent: 002-release-readiness
status: complete
priority: should
created: '2026-10-29T16:09:23Z'
assigned_bolt: 015-host-package
implemented: true
---

# Story: 006-release-pack-and-version-check

## User Story

**As a** release engineer
**I want** one command that prepares both packages and checks they match
**So that** a release can't mix versions

## Acceptance Criteria

- [ ] **Given** `pnpm release:pack`, **When** it runs, **Then** it produces the extension store zip and the host tarball
- [ ] **Given** different versions or a missing store ID, **When** packing, **Then** it fails with the reason
- [ ] **Given** host and extension versions differ in major or minor, **When** the setup check runs, **Then** it warns (non-blocking)

## Technical Notes

- Versions read from both package.json files

## Edge Cases

| Scenario | Expected Behavior |
|---|---|
| Patch versions differ | Allowed (no warning) |
