---
id: 004-health-check
unit: 002-native-host
intent: 001-one-click-tailored-cv
status: complete
priority: must
created: '2026-10-25T12:00:00Z'
assigned_bolt: 003-native-host
implemented: true
---

# Story: 004-health-check

## User Story

**As a** job seeker
**I want** the extension to tell me exactly what's missing: the host, Claude Code, my login, or a newer version
**So that** I can fix setup problems myself

## Acceptance Criteria

- [ ] **Given** the host is not registered, **When** the extension connects, **Then** it reports `HOST_NOT_INSTALLED`
- [ ] **Given** `claude` is not on PATH, **When** health runs, **Then** it reports `CLAUDE_NOT_FOUND`
- [ ] **Given** Claude Code is logged out, **When** health runs, **Then** it reports `CLAUDE_NOT_AUTHENTICATED`
- [ ] **Given** an installed version older than the tested minimum, **When** health runs, **Then** it returns a warning with an update hint (not a hard failure)

## Technical Notes

- Use detection methods documented in the spike
- Health check must be fast (≤ 5 s)

## Dependencies

### Requires
- 002-native-messaging-protocol
- 001-claude-code-headless-spike

### Enables
- None within this unit

## Edge Cases

| Scenario | Expected Behavior |
|---|---|
| Claude Code installed per-user, not on PATH for Chrome | Search known install locations before failing |

## Out of Scope

- UI rendering of results (005)
