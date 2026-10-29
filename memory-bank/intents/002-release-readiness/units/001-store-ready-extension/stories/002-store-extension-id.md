---
id: 002-store-extension-id
unit: 001-store-ready-extension
intent: 002-release-readiness
status: complete
priority: must
created: '2026-10-29T16:09:23Z'
assigned_bolt: 013-store-ready-extension
implemented: true
---

# Story: 002-store-extension-id

## User Story

**As a** user of the store version
**I want** the native host to accept the store extension
**So that** the store build connects to my installed host

## Acceptance Criteria

- [ ] **Given** `shared`, **When** read, **Then** it defines the dev ID and the store ID (one constant each) and the list of allowed origins
- [ ] **Given** the store ID is not set yet, **When** a release package is requested, **Then** it fails with a clear message (no placeholder ships)
- [ ] **Given** an install, **When** the manifest is written, **Then** `allowed_origins` contains exactly the two origins

## Technical Notes

- The store ID becomes known when the user creates the CWS draft item (Operations); it is filled in then

## Edge Cases

| Scenario | Expected Behavior |
|---|---|
| Store ID still empty during development | Dev builds and `pnpm run install-host` keep working with the dev ID only |
