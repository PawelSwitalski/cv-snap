---
id: 001-history-only-onboarding
unit: 002-history-only-mode
intent: 005-own-cv-in-history
status: complete
priority: must
created: '2026-11-04T16:40:00Z'
assigned_bolt: 029-history-only-mode
implemented: true
---

# Story: 001-history-only-onboarding

## User Story

**As a** job seeker
**I want** use cv-snap to track applications even without Claude
**So that** I get value before (or without) installing the helper

## Acceptance Criteria

- [x] **Given** the setup check fails, **When** I see it, **Then** Use without the helper is offered next to Check again
- [x] **Given** I choose it, **When** I upload a PDF, **Then** it is stored as my CV without any host call and I land on home in history-only mode
- [x] **Given** history-only home on a job ad, **When** shown, **Then** I see Save my CV to history (story 001-003) and, instead of Generate, "Tailoring needs the helper" with Set up the helper
- [x] **Given** I reopen the panel, **When** it loads, **Then** it goes straight to history-only home with no setup check
- [x] **Given** History, Settings and the privacy notice, **When** used in this mode, **Then** they work as with a profile
- [x] **Given** a user with a profile, **When** the helper goes missing, **Then** they are never put in history-only mode

## Technical Notes

- New panel mode flag in extension storage; `deriveView` gains the mode
- Upload in this mode stores `cv-original` only (no extraction, no draft)

## Edge Cases

| Scenario | Expected Behavior |
|---|---|
| Not a PDF / too large | Same messages as the normal upload |
