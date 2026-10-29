---
id: 008-regression-fixture-suite
unit: 001-cv-tailoring-core
intent: 001-one-click-tailored-cv
status: complete
priority: must
created: '2026-10-25T12:00:00Z'
assigned_bolt: 006-cv-tailoring-core
implemented: true
---

# Story: 008-regression-fixture-suite

## User Story

**As a** project author
**I want** a repeatable test suite over real ads and my CVs, including injection cases
**So that** I can prove 0 fabrications pass and catch regressions when prompts or models change

## Acceptance Criteria

- [ ] **Given** ≥ 3 anonymized CVs and ≥ 20 ads in `shared/test/fixtures/`, **When** the suite runs in recorded mode, **Then** it validates stored Claude outputs without network calls
- [ ] **Given** live mode (`pnpm test:live`), **When** run, **Then** it calls Claude via the host and records outputs for review
- [ ] **Given** any fixture, **When** the validator runs, **Then** 0 fabricated facts are marked verified (seeded fabrications must be caught)
- [ ] **Given** ≥ 3 injection fixtures, **When** run, **Then** outputs contain no injected content and the schema is respected
- [ ] **Given** the suite, **When** it finishes, **Then** it prints per-fixture verified/unverified counts and timing

## Technical Notes

- Fixture composition per requirements → Output Quality
- Injection cases generated from real ads by adding hidden instructions (CSS-hidden text, alt text, 'ignore previous instructions')
- Seeded-fabrication tests: mutate valid plans (inject fake skill/number/company) and assert rejection

## Dependencies

### Requires
- 007-generation-pipeline-with-retry

### Enables
- None within this unit

## Edge Cases

| Scenario | Expected Behavior |
|---|---|
| Fixture contains real personal data | Rejected by a pre-commit check scanning for e-mail/phone patterns |

## Out of Scope

- Automated quality scoring of tone/style
