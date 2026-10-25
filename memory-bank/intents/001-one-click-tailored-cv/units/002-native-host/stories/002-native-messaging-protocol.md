---
id: 002-native-messaging-protocol
unit: 002-native-host
intent: 001-one-click-tailored-cv
status: draft
priority: must
created: 2026-10-25T12:00:00Z
assigned_bolt: 003-native-host
implemented: false
---

# Story: 002-native-messaging-protocol

## User Story

**As a** developer
**I want** a robust stdio protocol with validation, size limits, progress events and cancel
**So that** the extension can talk to the host safely over a long-lived port

## Acceptance Criteria

- [ ] **Given** a framed JSON message, **When** received, **Then** it is validated with zod and dispatched by `type`; invalid frames get `INVALID_MESSAGE`
- [ ] **Given** an inbound frame > 64 MB or an outbound payload ≥ 1 MB, **When** detected, **Then** the host returns a typed error instead of crashing
- [ ] **Given** a long-running request, **When** steps progress, **Then** progress frames with the `requestId` are sent before the final reply
- [ ] **Given** a `cancel` frame for a `requestId`, **When** received, **Then** the running work is aborted and a `CANCELLED` reply is sent
- [ ] **Given** any code path, **When** the host logs, **Then** nothing but protocol frames is written to stdout (test asserts this)

## Technical Notes

- 4-byte little-endian length prefix
- Top-level try/catch converts everything to `{ ok: false }`
- Fuzz test with random/oversized/partial frames

## Dependencies

### Requires
- 001-claude-code-headless-spike
- 001-cv-tailoring-core/002-domain-schemas-and-contracts

### Enables
- 003-host-install-scripts
- 004-health-check
- 005-claude-code-provider
- 006-pdf-text-extraction

## Edge Cases

| Scenario | Expected Behavior |
|---|---|
| Partial frame across stdin chunks | Buffered until complete |
| Extension disconnects | Host aborts work and exits cleanly |

## Out of Scope

- Business logic of steps
