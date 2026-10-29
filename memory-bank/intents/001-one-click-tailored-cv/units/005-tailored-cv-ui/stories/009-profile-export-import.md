---
id: 009-profile-export-import
unit: 005-tailored-cv-ui
intent: 001-one-click-tailored-cv
status: complete
priority: should
created: '2026-10-25T12:00:00Z'
assigned_bolt: 012-tailored-cv-ui
implemented: true
---

# Story: 009-profile-export-import

## User Story

**As a** job seeker
**I want** to back up my profile to a file and restore it
**So that** I don't lose my reviewed profile when reinstalling or switching machines

## Acceptance Criteria

- [ ] **Given** an active profile, **When** I export, **Then** a JSON file with `schemaVersion` is downloaded (photo included only if I choose)
- [ ] **Given** a valid export file, **When** I import, **Then** I'm asked before it replaces my profile, and it becomes the active profile
- [ ] **Given** an invalid or newer-version file, **When** I import, **Then** it is rejected with a message

## Technical Notes

- Validate with `CvProfileSchema`; photo embedded as base64 when chosen

## Dependencies

### Requires
- 004-profile-review-editor

### Enables
- None within this unit

## Edge Cases

| Scenario | Expected Behavior |
|---|---|
| Import while a generation runs | Import blocked until it finishes |

## Out of Scope

- Cloud sync
