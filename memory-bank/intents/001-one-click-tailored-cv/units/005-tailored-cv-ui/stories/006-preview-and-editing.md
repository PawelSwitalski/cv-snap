---
id: 006-preview-and-editing
unit: 005-tailored-cv-ui
intent: 001-one-click-tailored-cv
status: complete
priority: must
created: '2026-10-25T12:00:00Z'
assigned_bolt: 011-tailored-cv-ui
implemented: true
---

# Story: 006-preview-and-editing

## User Story

**As a** job seeker
**I want** to see the tailored CV with requirements, gaps and unverified lines, edit it, and download it
**So that** I can trust and adjust the result before sending

## Acceptance Criteria

- [ ] **Given** a generation result, **When** shown, **Then** I see the CV preview, parsed requirements, the gaps list, and a summary of unverified lines
- [ ] **Given** an unverified line, **When** shown, **Then** it is marked with an icon and text (not only color) and I can edit or remove it
- [ ] **Given** I edit a line, **When** saved, **Then** it is marked 'user-edited' and excluded from validation
- [ ] **Given** the output-language override, **When** I choose another language and regenerate, **Then** the CV is produced in that language for this generation only
- [ ] **Given** items dropped by two-page fitting, **When** rendered, **Then** I see which items were dropped
- [ ] **Given** the preview, **When** I download, **Then** the PDF content matches the preview

## Technical Notes

- Preview uses the same render model as the PDF; 'Regenerate' reuses cached requirements

## Dependencies

### Requires
- 005-generate-flow-with-progress-and-cancel
- 004-cv-pdf-renderer/003-pdf-download-and-naming

### Enables
- None within this unit

## Edge Cases

| Scenario | Expected Behavior |
|---|---|
| All lines unverified | Strong warning before download |

## Out of Scope

- Generation history
