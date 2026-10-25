---
id: 003-cv-profile-extraction
unit: 001-cv-tailoring-core
intent: 001-one-click-tailored-cv
status: draft
priority: must
created: 2026-10-25T12:00:00Z
assigned_bolt: 005-cv-tailoring-core
implemented: false
---

# Story: 003-cv-profile-extraction

## User Story

**As a** job seeker
**I want** my CV text turned into a structured profile with an ID on every fact
**So that** every later CV can be built and checked only from facts I confirmed

## Acceptance Criteria

- [ ] **Given** extracted CV text, **When** profile creation runs, **Then** the result passes `CvProfileSchema` and records the source language
- [ ] **Given** invalid model output, **When** parsing fails, **Then** it retries once and then fails with `GENERATION_FAILED`
- [ ] **Given** the fixture CVs, **When** profiles are created, **Then** no fact appears that is absent from the source text (fixture test)
- [ ] **Given** the default model, **When** profile creation runs on fixtures, **Then** it completes in ≤ 90 s p95

## Technical Notes

- Prompt instructs: copy facts, don't infer; unknown fields stay empty
- IDs are assigned by code after parsing (not trusted from the model) to guarantee uniqueness

## Dependencies

### Requires
- 002-domain-schemas-and-contracts
- 002-native-host/005-claude-code-provider

### Enables
- 005-tailoring-plan-generation

## Edge Cases

| Scenario | Expected Behavior |
|---|---|
| Two-column CV with interleaved text | Best-effort grouping; user fixes in review |
| CV in a language other than PL/EN | Profile created in that language |

## Out of Scope

- Profile editing UI (005)
