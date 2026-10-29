---
id: 005-generate-flow-with-progress-and-cancel
unit: 005-tailored-cv-ui
intent: 001-one-click-tailored-cv
status: complete
priority: must
created: '2026-10-25T12:00:00Z'
assigned_bolt: 011-tailored-cv-ui
implemented: true
---

# Story: 005-generate-flow-with-progress-and-cancel

## User Story

**As a** job seeker
**I want** one Generate button that adapts to the page and shows progress I can cancel
**So that** I get a CV in one click and stay in control while it runs

## Acceptance Criteria

- [ ] **Given** an allowed page with a detected ad and a confirmed profile, **When** I click Generate, **Then** generation starts with no further input
- [ ] **Given** an unlisted page, **When** the panel shows the page state, **Then** the button reads 'Add this site' and, after approval, becomes Generate without reloading
- [ ] **Given** a running generation, **When** steps advance, **Then** progress is shown and announced via `aria-live`
- [ ] **Given** a running generation, **When** I click Cancel or close the panel, **Then** it stops within 2 s and the UI returns to ready
- [ ] **Given** no ad detected, **When** I click Generate, **Then** I'm guided to the manual selection fallback

## Technical Notes

- Subscribes to pipeline progress from the background worker

## Dependencies

### Requires
- 004-profile-review-editor
- 001-cv-tailoring-core/007-generation-pipeline-with-retry
- 003-job-ad-capture/005-manual-selection-fallback

### Enables
- 006-preview-and-editing
- 007-error-messages-and-recovery

## Edge Cases

| Scenario | Expected Behavior |
|---|---|
| Tab changes during generation | Generation continues for the original ad; result labelled with its title |

## Out of Scope

- Preview (006)
