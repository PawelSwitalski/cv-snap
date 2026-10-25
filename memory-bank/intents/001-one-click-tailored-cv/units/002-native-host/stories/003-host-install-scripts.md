---
id: 003-host-install-scripts
unit: 002-native-host
intent: 001-one-click-tailored-cv
status: draft
priority: must
created: 2026-10-25T12:00:00Z
assigned_bolt: 003-native-host
implemented: false
---

# Story: 003-host-install-scripts

## User Story

**As a** job seeker
**I want** to register the host with one command and remove it with another
**So that** the extension can find the host without manual registry editing

## Acceptance Criteria

- [ ] **Given** Node and the built host, **When** I run `pnpm run install-host`, **Then** the host manifest is written and the HKCU registry key points to it, without admin rights
- [ ] **Given** the manifest, **When** inspected, **Then** `allowed_origins` contains only the cv-snap extension ID
- [ ] **Given** an existing registration, **When** I run install again, **Then** one correct registration remains
- [ ] **Given** a registration, **When** I run `pnpm run uninstall-host`, **Then** the key and manifest are removed

## Technical Notes

- Fixed extension ID via `key` in the manifest so `allowed_origins` is stable in development
- Host launched through a small `.cmd` wrapper calling Node

## Dependencies

### Requires
- 002-native-messaging-protocol

### Enables
- None within this unit

## Edge Cases

| Scenario | Expected Behavior |
|---|---|
| Path with spaces/Polish characters | Quoted correctly; tested |

## Out of Scope

- macOS/Linux registration (portable code, untested)
