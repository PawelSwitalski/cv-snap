---
id: 005-doctor-command
unit: 002-host-package
intent: 002-release-readiness
status: draft
priority: should
created: 2026-10-29T16:09:23Z
assigned_bolt: 015-host-package
implemented: false
---

# Story: 005-doctor-command

## User Story

**As a** user with a broken setup
**I want** one command that checks everything and tells me the fix
**So that** I can repair it without help

## Acceptance Criteria

- [ ] **Given** `doctor`, **When** run, **Then** it checks registration, launcher target, Node version, allowed extension IDs and Claude Code (found, logged in, version)
- [ ] **Given** a failed check, **When** reported, **Then** it shows a fix (e.g. run `npx cv-snap-host install`)
- [ ] **Given** the result, **When** it ends, **Then** the exit code is 0 if all checks pass, else 1; no personal data is printed

## Technical Notes

- Reuses the existing health check for Claude Code

## Edge Cases

| Scenario | Expected Behavior |
|---|---|
| Claude Code not logged in | Reported as a failure with `claude` login hint; registration checks still shown |
