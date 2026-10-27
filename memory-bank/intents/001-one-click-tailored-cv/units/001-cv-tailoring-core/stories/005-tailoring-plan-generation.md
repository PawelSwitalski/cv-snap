---
id: 005-tailoring-plan-generation
unit: 001-cv-tailoring-core
intent: 001-one-click-tailored-cv
status: complete
priority: must
created: '2026-10-25T12:00:00Z'
assigned_bolt: 005-cv-tailoring-core
implemented: true
---

# Story: 005-tailoring-plan-generation

## User Story

**As a** job seeker
**I want** Claude to select, order and rephrase my profile facts for this ad, in the ad's language, citing sources for every line
**So that** I get a targeted CV that is fully traceable to my real experience

## Acceptance Criteria

- [ ] **Given** a confirmed profile and requirements, **When** tailoring runs, **Then** the plan passes `TailoringPlanSchema` and every bullet, summary sentence and skill cites ≥ 1 existing profile `id`
- [ ] **Given** an ad in language X (any language), **When** tailoring runs without override, **Then** the plan is written in X; with an override, in the chosen language
- [ ] **Given** a language other than PL/EN, **When** the plan is produced, **Then** it includes section headings in that language
- [ ] **Given** requirements the profile doesn't meet, **When** tailoring runs, **Then** they appear only in `gaps` and never in CV lines
- [ ] **Given** items in the plan, **When** produced, **Then** each has a relevance `rank` used later for page fitting

## Technical Notes

- Prompt: select/reorder/rephrase only; never add facts; list unmet requirements as gaps
- Pass profile as JSON and requirements as JSON; ad raw text is NOT sent to this step (reduces injection surface)

## Dependencies

### Requires
- 003-cv-profile-extraction
- 004-job-requirements-parsing-and-cache

### Enables
- 007-generation-pipeline-with-retry

## Edge Cases

| Scenario | Expected Behavior |
|---|---|
| Profile and ad in different languages | Translated output; validator handles via language-independent facts |
| Very weak match | Short CV, long gaps list, no padding |

## Out of Scope

- Validation (006)
- Rendering (004 unit)
