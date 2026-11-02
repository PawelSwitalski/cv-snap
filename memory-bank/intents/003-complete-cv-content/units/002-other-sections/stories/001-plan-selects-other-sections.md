---
id: 001-plan-selects-other-sections
unit: 002-other-sections
intent: 003-complete-cv-content
status: complete
priority: must
created: '2026-11-02T18:45:00Z'
assigned_bolt: 021-other-sections
implemented: true
---

# Story: 001-plan-selects-other-sections

## User Story

**As a** job seeker
**I want** the AI to pick the extra sections of my CV that help for this ad
**So that** relevant courses or volunteering show up without cluttering every CV

## Acceptance Criteria

- [x] **Given** the tailoring plan schema, **When** a plan has an optional list of selected other sections (ID, optional title in the output language), **Then** it is valid; **And** a plan without that list is also valid
- [x] **Given** the tailoring prompt, **When** built for a profile with other sections, **Then** it tells the model it may select relevant ones by ID, and to give a title only when the output language differs from the profile's
- [x] **Given** a plan selecting an other-section ID not in the profile, **When** validated, **Then** it is rejected with validator feedback, like other unknown IDs
- [x] **Given** the existing validator tests, **When** run, **Then** all pass unchanged
- [x] **Given** the profile prompt input, **When** built, **Then** `otherSections` is still included (already the case)

## Technical Notes

- `shared/src/tailoring-plan.ts`, `shared/src/prompts/tailor.ts`, `shared/src/validation/source-facts.ts`
- Lines of selected sections are printed from the profile, so they are trusted facts; only a translated title is model text (short, no claims)
- The prompt is built in the host, so this story is why the host ships 0.1.1

## Edge Cases

| Scenario | Expected Behavior |
|---|---|
| Same section selected twice | Validation passes; printed once |
| Profile has no other sections | Prompt doesn't mention them |
