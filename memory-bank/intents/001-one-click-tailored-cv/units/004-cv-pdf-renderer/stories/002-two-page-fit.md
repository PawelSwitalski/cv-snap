---
id: 002-two-page-fit
unit: 004-cv-pdf-renderer
intent: 001-one-click-tailored-cv
status: complete
priority: must
created: '2026-10-25T12:00:00Z'
assigned_bolt: 009-cv-pdf-renderer
implemented: true
---

# Story: 002-two-page-fit

## User Story

**As a** job seeker
**I want** the CV to never exceed two pages
**So that** it matches recruiter expectations

## Acceptance Criteria

- [ ] **Given** content longer than 2 pages, **When** fitting runs, **Then** lowest-ranked items/bullets are dropped deterministically until ≤ 2 pages
- [ ] **Given** items were dropped, **When** fitting finishes, **Then** the list of dropped items is returned for the UI to show
- [ ] **Given** content ≤ 2 pages, **When** fitting runs, **Then** nothing is dropped
- [ ] **Given** the same input, **When** fitted twice, **Then** the result is identical

## Technical Notes

- Measure via render pass page count; drop bullets before whole items; never drop header/contact

## Dependencies

### Requires
- 001-cv-pdf-template

### Enables
- None within this unit

## Edge Cases

| Scenario | Expected Behavior |
|---|---|
| Single item longer than a page | Bullets trimmed from the end by rank |

## Out of Scope

- Rewriting text to shorten it
