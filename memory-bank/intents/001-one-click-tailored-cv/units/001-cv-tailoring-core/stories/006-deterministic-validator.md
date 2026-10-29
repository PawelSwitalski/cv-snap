---
id: 006-deterministic-validator
unit: 001-cv-tailoring-core
intent: 001-one-click-tailored-cv
status: complete
priority: must
created: '2026-10-25T12:00:00Z'
assigned_bolt: 006-cv-tailoring-core
implemented: true
---

# Story: 006-deterministic-validator

## User Story

**As a** job seeker
**I want** every generated line checked by code against my profile before I see it
**So that** made-up facts can never reach my CV unflagged

## Acceptance Criteria

- [ ] **Given** a plan line citing an unknown or no `sourceId`, **When** validated, **Then** it is rejected with rule `UNKNOWN_SOURCE`
- [ ] **Given** a skill/technology not present in the profile, **When** validated, **Then** it is rejected with rule `UNKNOWN_SKILL`
- [ ] **Given** a number, date, percentage, company name or job title not present in the cited source items, **When** validated, **Then** it is rejected with the matching rule
- [ ] **Given** a correctly translated line (e.g. EN profile → PL CV), **When** validated, **Then** it passes because numbers, dates, proper nouns and skill identifiers match
- [ ] **Given** lines marked user-edited, **When** validated, **Then** they are skipped

## Technical Notes

- Pure function `validatePlan(plan, profile)`; no I/O, no LLM
- Normalize numbers (1,5 vs 1.5; 10k vs 10 000), dates (month names in any language → ISO), and case/diacritics for proper nouns
- Skill matching against a normalized alias list built from the profile (e.g. `JS` ↔ `JavaScript`)
- One unit test per rule plus property-style tests for normalization

## Dependencies

### Requires
- 002-domain-schemas-and-contracts

### Enables
- 007-generation-pipeline-with-retry

## Edge Cases

| Scenario | Expected Behavior |
|---|---|
| Number written as a word ('five years') | Normalized to 5 and checked |
| Company name declined in Polish ('w Google'/'Googlu') | Stem/prefix match on proper nouns from cited items |

## Out of Scope

- Semantic exaggeration checks (strict mode — future intent)
