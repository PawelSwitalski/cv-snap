---
id: 004-job-requirements-parsing-and-cache
unit: 001-cv-tailoring-core
intent: 001-one-click-tailored-cv
status: draft
priority: must
created: 2026-10-25T12:00:00Z
assigned_bolt: 005-cv-tailoring-core
implemented: false
---

# Story: 004-job-requirements-parsing-and-cache

## User Story

**As a** job seeker
**I want** the job ad turned into structured requirements, reused when I regenerate
**So that** the CV is matched against what the employer actually asks for, without repeating slow calls

## Acceptance Criteria

- [ ] **Given** ad text (and optional JSON-LD fields), **When** parsing runs, **Then** the result passes `JobRequirementsSchema` with an ISO 639-1 language code
- [ ] **Given** a URL parsed within the last 7 days, **When** I generate again, **Then** no Claude call is made for requirements
- [ ] **Given** a cache entry older than 7 days, **When** I generate, **Then** requirements are parsed again and the entry is replaced
- [ ] **Given** an ad containing injected instructions, **When** parsed, **Then** the injected text is treated as ad content only

## Technical Notes

- Ad text wrapped in explicit delimiters with an instruction that it is untrusted data
- Cache key: normalized URL (strip tracking params like `utm_*`, `trk`)

## Dependencies

### Requires
- 002-domain-schemas-and-contracts
- 002-native-host/005-claude-code-provider

### Enables
- 005-tailoring-plan-generation

## Edge Cases

| Scenario | Expected Behavior |
|---|---|
| Same ad via different tracking URLs | Normalized URL hits the cache |
| Manual selection (no stable URL) | Cache key is URL + hash of the selected text |

## Out of Scope

- Ad capture from the page (003)
