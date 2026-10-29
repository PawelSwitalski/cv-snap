---
id: 003-cv-upload-and-profile-creation
unit: 005-tailored-cv-ui
intent: 001-one-click-tailored-cv
status: complete
priority: must
created: '2026-10-25T12:00:00Z'
assigned_bolt: 010-tailored-cv-ui
implemented: true
---

# Story: 003-cv-upload-and-profile-creation

## User Story

**As a** job seeker
**I want** to upload my CV PDF and have a draft profile created from it
**So that** I don't have to type my CV into cv-snap

## Acceptance Criteria

- [ ] **Given** a `.pdf` ≤ 10 MB, **When** I upload it, **Then** it is stored in IndexedDB and profile creation starts with progress shown
- [ ] **Given** a non-PDF or > 10 MB file, **When** I upload it, **Then** it is rejected before sending, with a message
- [ ] **Given** a scanned PDF, **When** processed, **Then** I see that scanned PDFs aren't supported
- [ ] **Given** an existing active profile, **When** I upload a new PDF, **Then** a new draft is created and I'm asked before it replaces the active profile

## Technical Notes

- PDF sent to host as base64 in one message (< 64 MB limit)

## Dependencies

### Requires
- 002-onboarding-and-privacy-notice
- 002-native-host/006-pdf-text-extraction
- 001-cv-tailoring-core/003-cv-profile-extraction

### Enables
- 004-profile-review-editor

## Edge Cases

| Scenario | Expected Behavior |
|---|---|
| Panel closed during creation | Creation cancelled; draft not saved |

## Out of Scope

- Profile editing (004)
