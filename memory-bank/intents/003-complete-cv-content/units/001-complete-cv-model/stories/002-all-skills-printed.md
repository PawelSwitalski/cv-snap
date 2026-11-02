---
id: 002-all-skills-printed
unit: 001-complete-cv-model
intent: 003-complete-cv-content
status: complete
priority: must
created: '2026-11-02T18:45:00Z'
assigned_bolt: 020-complete-cv-model
implemented: true
---

# Story: 002-all-skills-printed

## User Story

**As a** job seeker
**I want** all my skills in the CV, the ones that match the ad first
**So that** no skill I listed is silently lost

## Acceptance Criteria

- [x] **Given** a plan selecting some skills, **When** the model is built, **Then** the skills section lists the plan's skills in plan order, followed by every other profile skill in profile order
- [x] **Given** a plan skill that cites a profile skill, **When** the model is built, **Then** that profile skill appears once (the plan's name kept)
- [x] **Given** a CV still over two pages after all ranked bullets and items are dropped, **When** fitting continues, **Then** non-selected skills are dropped from the end, one per step, and reported
- [x] **Given** any fit, **When** it finishes, **Then** plan-selected skills are never dropped

## Technical Notes

- Plan skills carry `sourceIds`; a profile skill counts as selected if its ID is in any plan skill's `sourceIds`
- New `DropStep` kind (e.g. `skill`) after all current steps; `DroppedContent.kind` gains the same value; the dropped-content message needs a label for it (EN + PL)

## Edge Cases

| Scenario | Expected Behavior |
|---|---|
| Plan selects no skills | All profile skills, profile order |
| Profile has no skills | No skills section (as today) |
