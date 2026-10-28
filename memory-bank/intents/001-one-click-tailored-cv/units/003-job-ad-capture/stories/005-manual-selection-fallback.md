---
id: 005-manual-selection-fallback
unit: 003-job-ad-capture
intent: 001-one-click-tailored-cv
status: complete
priority: must
created: '2026-10-25T12:00:00Z'
assigned_bolt: 008-job-ad-capture
implemented: true
---

# Story: 005-manual-selection-fallback

## User Story

**As a** job seeker
**I want** to select the ad text myself when automatic detection fails
**So that** I can still generate a CV on any allowed page

## Acceptance Criteria

- [ ] **Given** selected text on an allowed page, **When** I click Generate, **Then** the selection is used instead of automatic extraction
- [ ] **Given** a selection shorter than 200 characters, **When** I click Generate, **Then** I see a 'selection too short' message
- [ ] **Given** no selection and no detected ad, **When** I click Generate, **Then** I'm told to select the ad text and try again

## Technical Notes

- Read selection via the content script (`window.getSelection()`)

## Dependencies

### Requires
- 004-job-ad-text-extraction

### Enables
- None within this unit

## Edge Cases

| Scenario | Expected Behavior |
|---|---|
| Selection spans multiple elements | Plain text with line breaks preserved |

## Out of Scope

- Selection on non-allowed pages
