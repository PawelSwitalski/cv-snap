---
id: 002-helper-later
unit: 002-history-only-mode
intent: 005-own-cv-in-history
status: draft
priority: must
created: '2026-11-04T16:40:00Z'
assigned_bolt: 029-history-only-mode
implemented: false
---

# Story: 002-helper-later

## User Story

**As a** job seeker
**I want** turn on tailoring later without starting over
**So that** my history and CV stay

## Acceptance Criteria

- [ ] **Given** history-only mode, **When** I choose Set up the helper and the check passes, **Then** I'm offered Create my profile from my CV
- [ ] **Given** I accept, **When** extraction finishes, **Then** the editor opens with a draft, as in normal onboarding, and after confirming I'm on home with Generate
- [ ] **Given** the check fails again, **When** shown, **Then** I can go back to history-only home
- [ ] **Given** the switch, **When** done, **Then** every history entry and the stored CV are unchanged and history-only mode is off

## Technical Notes

- Runs the existing profile extraction on the stored `cv-original`

## Edge Cases

| Scenario | Expected Behavior |
|---|---|
| Extraction fails | Existing error; the user stays in history-only mode |
