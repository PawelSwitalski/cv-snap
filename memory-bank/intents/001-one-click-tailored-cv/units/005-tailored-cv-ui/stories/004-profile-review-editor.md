---
id: 004-profile-review-editor
unit: 005-tailored-cv-ui
intent: 001-one-click-tailored-cv
status: complete
priority: must
created: '2026-10-25T12:00:00Z'
assigned_bolt: 010-tailored-cv-ui
implemented: true
---

# Story: 004-profile-review-editor

## User Story

**As a** job seeker
**I want** to review and correct my profile, add a photo, and confirm it
**So that** cv-snap only ever uses facts I've checked

## Acceptance Criteria

- [ ] **Given** a draft profile, **When** I open it, **Then** I can edit, add, delete and reorder items and bullets in every section
- [ ] **Given** any edit, **When** made, **Then** it is saved immediately and survives closing the panel
- [ ] **Given** existing items, **When** edited, **Then** their IDs never change; new items get new unique IDs
- [ ] **Given** a JPG/PNG ≤ 2 MB, **When** I add it as photo, **Then** it is stored and shown; larger or other files are rejected
- [ ] **Given** an unconfirmed profile, **When** I try to generate, **Then** Generate is disabled with a hint to confirm the profile first

## Technical Notes

- Form inputs labelled for accessibility; keyboard reordering

## Dependencies

### Requires
- 003-cv-upload-and-profile-creation

### Enables
- 005-generate-flow-with-progress-and-cancel
- 009-profile-export-import

## Edge Cases

| Scenario | Expected Behavior |
|---|---|
| Deleting an item referenced by the cached last plan | Plan invalidated; regenerate required |

## Out of Scope

- Export/import (009)
