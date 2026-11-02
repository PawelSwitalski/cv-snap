---
id: 003-live-regression-education
unit: 001-complete-cv-model
intent: 003-complete-cv-content
status: complete
priority: must
created: '2026-11-02T18:45:00Z'
assigned_bolt: 020-complete-cv-model
implemented: true
---

# Story: 003-live-regression-education

## User Story

**As a** maintainer
**I want** the live regression set to check education and skills
**So that** a prompt or model change can't bring the bug back unnoticed

## Acceptance Criteria

- [x] **Given** `pnpm test:live`, **When** a fixture is tailored, **Then** the run fails if the CV model is missing any education entry of the fixture profile
- [x] **Given** the same run, **When** checked, **Then** every profile skill is in the CV model
- [x] **Given** the fixture set, **When** reviewed, **Then** at least one fixture has two or more education entries and an ad that doesn't mention education

## Technical Notes

- `shared/test/regression/` (`metrics.ts`, `fixture-repository.ts`); the check needs `buildCvModel` reachable from the regression runner, or an equivalent check of profile vs plan using the same rules
- The unit-test part of FR-5 is covered in stories 001 and 002

## Edge Cases

| Scenario | Expected Behavior |
|---|---|
| Fixture profile without education | Check passes trivially |
