---
id: 002-domain-schemas-and-contracts
unit: 001-cv-tailoring-core
intent: 001-one-click-tailored-cv
status: complete
priority: must
created: '2026-10-25T12:00:00Z'
assigned_bolt: 002-cv-tailoring-core
implemented: true
---

# Story: 002-domain-schemas-and-contracts

## User Story

**As a** developer
**I want** zod schemas and types for the CV profile, job requirements, tailoring plan, native messages, error codes and the provider interface
**So that** the extension and host agree on one checked contract

## Acceptance Criteria

- [ ] **Given** the shared package, **When** I import `CvProfileSchema`, `JobRequirementsSchema`, `TailoringPlanSchema`, **Then** each parses valid fixtures and rejects invalid ones with readable errors
- [ ] **Given** a profile, **When** it is created or edited, **Then** every item and bullet has a unique `id` that never changes on edit
- [ ] **Given** the message protocol, **When** I define a request, **Then** it is a discriminated union with `requestId` and replies are `NativeResponse<T>`
- [ ] **Given** the `ErrorCode` union, **When** I list it, **Then** it contains every code named in requirements (incl. `MODEL_UNAVAILABLE`, `JOB_AD_NOT_DETECTED`)
- [ ] **Given** `CvGenerationProvider`, **When** I read the interface, **Then** it exposes `createProfile`, `parseRequirements`, `tailor` and a health check, with progress callback and cancellation (`AbortSignal`)

## Technical Notes

- Every schema carries `schemaVersion` where persisted (profile, export)
- Plan lines carry `sourceIds: string[]` (min 1) and `rank` for items
- Language fields are ISO 639-1 codes

## Dependencies

### Requires
- 001-monorepo-scaffold

### Enables
- 003-cv-profile-extraction
- 004-job-requirements-parsing-and-cache
- 006-deterministic-validator

## Edge Cases

| Scenario | Expected Behavior |
|---|---|
| Duplicate IDs in a parsed profile | Schema refinement rejects it |
| Unknown message type | Parse fails with INVALID_MESSAGE |

## Out of Scope

- Prompt text
- Validator logic
