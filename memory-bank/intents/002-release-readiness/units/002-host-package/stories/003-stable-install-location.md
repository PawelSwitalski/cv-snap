---
id: 003-stable-install-location
unit: 002-host-package
intent: 002-release-readiness
status: complete
priority: must
created: '2026-10-29T16:09:23Z'
assigned_bolt: 014-host-package
implemented: true
---

# Story: 003-stable-install-location

## User Story

**As a** user
**I want** the installed host to keep working after npm cleans its cache
**So that** cv-snap doesn't break weeks later

## Acceptance Criteria

- [ ] **Given** `install`, **When** it runs, **Then** the runtime is copied to the per-user host directory and the launcher points there
- [ ] **Given** the npx cache is deleted, **When** Chrome starts the host, **Then** it still works
- [ ] **Given** a newer version, **When** `install` runs again, **Then** it upgrades in place; a failed copy leaves the previous installation working
- [ ] **Given** `uninstall`, **When** it runs, **Then** runtime, launcher, manifest and registration are removed; logs stay unless `--purge`

## Technical Notes

- Copy to a temporary sibling directory, then swap, so a failure never leaves a half-installed host

## Edge Cases

| Scenario | Expected Behavior |
|---|---|
| Host running during an upgrade (Windows file locks) | Install reports it and asks to close Chrome's cv-snap panel first |
