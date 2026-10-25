---
id: 007-generation-pipeline-with-retry
unit: 001-cv-tailoring-core
intent: 001-one-click-tailored-cv
status: draft
priority: must
created: 2026-10-25T12:00:00Z
assigned_bolt: 006-cv-tailoring-core
implemented: false
---

# Story: 007-generation-pipeline-with-retry

## User Story

**As a** job seeker
**I want** one Generate action to run every step, retry once on validation failure, and report progress
**So that** I get a verified preview from a single click

## Acceptance Criteria

- [ ] **Given** ad input and a confirmed profile, **When** `runGeneration` runs, **Then** it executes requirements (cached) → tailor → validate and returns plan + validation results
- [ ] **Given** validator failures, **When** the first plan fails, **Then** tailoring is re-run once with the violations attached; remaining failures are marked unverified
- [ ] **Given** a running generation, **When** each step starts, **Then** a progress event (`parsing-requirements`, `tailoring`, `validating`, `retrying`) is emitted
- [ ] **Given** a cancel signal, **When** received, **Then** the pipeline stops, the host request is cancelled, and a `CANCELLED` result is returned
- [ ] **Given** no confirmed profile, **When** generation is requested, **Then** it fails immediately with a typed error

## Technical Notes

- Runs in the extension background worker; UI subscribes to progress
- Never more than 2 tailoring calls per generation

## Dependencies

### Requires
- 005-tailoring-plan-generation
- 006-deterministic-validator

### Enables
- 008-regression-fixture-suite

## Edge Cases

| Scenario | Expected Behavior |
|---|---|
| Host disconnects mid-run | Pipeline returns HOST_DISCONNECTED |
| Retry produces worse result | Keep the plan with fewer violations |

## Out of Scope

- Rendering and UI
