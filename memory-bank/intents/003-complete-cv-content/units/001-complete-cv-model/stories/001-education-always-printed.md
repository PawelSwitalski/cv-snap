---
id: 001-education-always-printed
unit: 001-complete-cv-model
intent: 003-complete-cv-content
status: complete
priority: must
created: '2026-11-02T18:45:00Z'
assigned_bolt: 020-complete-cv-model
implemented: true
---

# Story: 001-education-always-printed

## User Story

**As a** job seeker
**I want** every education entry from my profile in the tailored CV
**So that** employers see my degrees even when the ad doesn't ask for them

## Acceptance Criteria

- [x] **Given** a profile with N education entries and a plan with no education items, **When** `buildCvModel` runs, **Then** the model has an education section with N entries, printed with their profile bullets
- [x] **Given** a plan that ranks some education entries, **When** the model is built, **Then** those entries keep the plan's order and bullets, and the remaining entries follow in profile order with profile bullets
- [x] **Given** a plan with no education items, **When** the model is built, **Then** the education section comes after experience and projects
- [x] **Given** a CV over two pages, **When** `planDropSteps` runs, **Then** it may drop education bullets but never an education entry
- [x] **Given** education bullets were dropped, **When** the result is shown, **Then** they are listed with the other dropped content

## Technical Notes

- `extension/src/features/cv-pdf/cv-model.ts` (`buildCvModel`), `fit-to-pages.ts` (`planDropSteps`)
- Mark education entries as kept (e.g. a flag on `CvEntry` or a check by section key) instead of special-casing IDs in the fitter
- Profile bullets of non-planned entries are trusted profile text (no citations needed)

## Edge Cases

| Scenario | Expected Behavior |
|---|---|
| Profile without education | No education section (as today) |
| Plan repeats an education ID | Printed once (existing de-duplication) |
| Education alone pushes the CV over two pages | Fit drops all droppable content; `fits: false` reported as today |
