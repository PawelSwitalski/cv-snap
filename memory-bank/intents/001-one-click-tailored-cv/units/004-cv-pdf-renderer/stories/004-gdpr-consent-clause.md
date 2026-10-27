---
id: 004-gdpr-consent-clause
unit: 004-cv-pdf-renderer
intent: 001-one-click-tailored-cv
status: complete
priority: should
created: '2026-10-25T12:00:00Z'
assigned_bolt: 009-cv-pdf-renderer
implemented: true
---

# Story: 004-gdpr-consent-clause

## User Story

**As a** job seeker
**I want** my consent clause added automatically when needed
**So that** Polish employers can process my application

## Acceptance Criteria

- [ ] **Given** default settings and a Polish ad, **When** rendered, **Then** the clause from settings appears in the footer
- [ ] **Given** default settings and a non-Polish ad, **When** rendered, **Then** no clause appears
- [ ] **Given** mode 'always' or 'never', **When** rendered, **Then** the clause is always / never included
- [ ] **Given** any rendering, **When** the clause is included, **Then** its text is taken verbatim from settings (never from Claude)

## Technical Notes

- Default PL template text and EN equivalent stored as defaults; editing UI lives in 005/008

## Dependencies

### Requires
- 001-cv-pdf-template

### Enables
- None within this unit

## Edge Cases

| Scenario | Expected Behavior |
|---|---|
| Clause pushes CV to page 3 | Clause space reserved before fitting |

## Out of Scope

- Clause editor UI (005)
