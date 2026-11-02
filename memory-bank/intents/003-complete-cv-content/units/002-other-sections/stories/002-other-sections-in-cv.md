---
id: 002-other-sections-in-cv
unit: 002-other-sections
intent: 003-complete-cv-content
status: complete
priority: should
created: '2026-11-02T18:45:00Z'
assigned_bolt: 021-other-sections
implemented: true
---

# Story: 002-other-sections-in-cv

## User Story

**As a** job seeker
**I want** the selected extra sections printed in my CV
**So that** they help my application without pushing out more important content

## Acceptance Criteria

- [x] **Given** a plan selecting other sections, **When** the model is built, **Then** each appears as its own section (after the ranked sections, before languages and certifications) with the plan's title or else the profile title, and the profile's lines
- [x] **Given** a plan selecting none (or a plan from an older host), **When** the model is built, **Then** no other section is printed
- [x] **Given** a CV over two pages, **When** `planDropSteps` runs, **Then** other sections are dropped first (last selected first, whole section per step), before any ranked bullet, and reported
- [x] **Given** the PDF, **When** rendered, **Then** other sections use the existing list layout and fonts

## Technical Notes

- `cv-model.ts` (new section kind with `layout: "list"`), `fit-to-pages.ts` (new step kind before the ranked steps), `CvDocument.tsx` if the list layout needs a per-section heading
- Dropped-content message: label for an other section (EN + PL)

## Edge Cases

| Scenario | Expected Behavior |
|---|---|
| Selected section has no lines | Not printed |
| Plan title empty or whitespace | Profile title used |
