---
id: 003-pdf-download-and-naming
unit: 004-cv-pdf-renderer
intent: 001-one-click-tailored-cv
status: complete
priority: must
created: '2026-10-25T12:00:00Z'
assigned_bolt: 009-cv-pdf-renderer
implemented: true
---

# Story: 003-pdf-download-and-naming

## User Story

**As a** job seeker
**I want** to download the CV with a sensible file name
**So that** I can attach it without renaming

## Acceptance Criteria

- [ ] **Given** a rendered CV, **When** I download, **Then** the file is named `CV_{FirstName}_{LastName}_{Company}.pdf`
- [ ] **Given** names with diacritics or spaces, **When** named, **Then** they are transliterated to ASCII and spaces become underscores (e.g. `Łukasz Żółć` → `Lukasz_Zolc`)
- [ ] **Given** no company in requirements, **When** named, **Then** the company part is omitted

## Technical Notes

- Blob URL + anchor download from the side panel

## Dependencies

### Requires
- 001-cv-pdf-template

### Enables
- None within this unit

## Edge Cases

| Scenario | Expected Behavior |
|---|---|
| Very long company name | Truncated to 40 chars |

## Out of Scope

- Download history
