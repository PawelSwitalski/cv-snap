---
id: 001-cv-pdf-template
unit: 004-cv-pdf-renderer
intent: 001-one-click-tailored-cv
status: draft
priority: must
created: 2026-10-25T12:00:00Z
assigned_bolt: 009-cv-pdf-renderer
implemented: false
---

# Story: 001-cv-pdf-template

## User Story

**As a** job seeker
**I want** a clean, professional A4 CV generated from my tailored plan
**So that** I can send it to employers directly

## Acceptance Criteria

- [ ] **Given** a plan and profile, **When** rendered, **Then** the PDF contains header/contact, summary, experience, skills, education and other included sections in plan order
- [ ] **Given** a profile photo, **When** rendered, **Then** it appears in the header; without one, the layout has no gap
- [ ] **Given** output language PL or EN, **When** rendered, **Then** built-in headings are used; for other languages, the plan's headings are used
- [ ] **Given** the PDF, **When** opened in a viewer, **Then** text is selectable and Polish diacritics render correctly
- [ ] **Given** unverified lines the user kept, **When** rendered, **Then** they appear as normal text (markers are preview-only)

## Technical Notes

- Template is a React component tree for `@react-pdf/renderer`
- Embed fonts; register a fallback font for non-Latin scripts

## Dependencies

### Requires
- 001-cv-tailoring-core/002-domain-schemas-and-contracts

### Enables
- 002-two-page-fit
- 003-pdf-download-and-naming
- 004-gdpr-consent-clause

## Edge Cases

| Scenario | Expected Behavior |
|---|---|
| Very long company names | Wrap without overflow |
| Right-to-left language ads | Best effort; text direction set per language |

## Out of Scope

- Multiple templates
