---
id: 006-pdf-text-extraction
unit: 002-native-host
intent: 001-one-click-tailored-cv
status: draft
priority: must
created: 2026-10-25T12:00:00Z
assigned_bolt: 004-native-host
implemented: false
---

# Story: 006-pdf-text-extraction

## User Story

**As a** job seeker
**I want** the host to read the text from my CV PDF reliably, including two-column layouts
**So that** my profile is built from complete, correctly ordered text

## Acceptance Criteria

- [ ] **Given** a text-based PDF ≤ 10 MB, **When** extracted, **Then** the text and page count are returned
- [ ] **Given** a two-column fixture PDF, **When** extracted, **Then** columns are not interleaved line-by-line
- [ ] **Given** a scanned/image-only PDF, **When** extracted, **Then** `PDF_PARSE_FAILED` with reason `NO_TEXT` is returned
- [ ] **Given** a corrupted or password-protected file, **When** extracted, **Then** `PDF_PARSE_FAILED` with a specific reason is returned

## Technical Notes

- Use `pdfjs-dist` text items with x/y positions; cluster into columns before ordering

## Dependencies

### Requires
- 002-native-messaging-protocol

### Enables
- None within this unit

## Edge Cases

| Scenario | Expected Behavior |
|---|---|
| Ligatures / special glyphs | Normalized to plain text |
| Header/footer repeated per page | De-duplicated |

## Out of Scope

- OCR (future intent)
