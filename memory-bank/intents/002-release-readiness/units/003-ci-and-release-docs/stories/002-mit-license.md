---
id: 002-mit-license
unit: 003-ci-and-release-docs
intent: 002-release-readiness
status: draft
priority: must
created: 2026-10-29T16:09:23Z
assigned_bolt: 016-ci-and-release-docs
implemented: false
---

# Story: 002-mit-license

## User Story

**As a** user or contributor
**I want** a clear license
**So that** I know how I may use the code

## Acceptance Criteria

- [ ] **Given** the repository, **When** viewed, **Then** `LICENSE` (MIT, author and year) is at the root and in the host package
- [ ] **Given** the bundled Noto Sans fonts, **When** distributed, **Then** their OFL notice stays
- [ ] **Given** the published packages, **When** inspected, **Then** `license` fields say MIT

## Technical Notes

- None

## Edge Cases

| Scenario | Expected Behavior |
|---|---|
| Third-party code bundled into the host | Its licenses are listed in a notices file shipped with the package |
