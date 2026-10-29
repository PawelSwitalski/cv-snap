---
id: 007-error-messages-and-recovery
unit: 005-tailored-cv-ui
intent: 001-one-click-tailored-cv
status: complete
priority: must
created: '2026-10-25T12:00:00Z'
assigned_bolt: 011-tailored-cv-ui
implemented: true
---

# Story: 007-error-messages-and-recovery

## User Story

**As a** job seeker
**I want** clear messages with a fix for every failure, and no stuck screens
**So that** I can recover without guessing

## Acceptance Criteria

- [ ] **Given** any `ErrorCode`, **When** it surfaces, **Then** a PL/EN message with a fix hint is shown (e.g. 'Run `pnpm run install-host`')
- [ ] **Given** a host disconnect, **When** detected, **Then** a 'Reconnect' action is offered
- [ ] **Given** `GENERATION_TIMEOUT`, **When** shown, **Then** I can retry with one click
- [ ] **Given** any error during any async state, **When** it occurs, **Then** the UI leaves the loading state
- [ ] **Given** an unexpected render error, **When** it occurs, **Then** the error boundary shows a recovery screen instead of a blank panel

## Technical Notes

- A test enumerates every `ErrorCode` and asserts a message exists in both locales

## Dependencies

### Requires
- 005-generate-flow-with-progress-and-cancel

### Enables
- None within this unit

## Edge Cases

| Scenario | Expected Behavior |
|---|---|
| Error while offline | Message mentions network/Claude availability |

## Out of Scope

- Telemetry
