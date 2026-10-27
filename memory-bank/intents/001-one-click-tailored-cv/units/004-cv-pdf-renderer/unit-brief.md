---
unit: 004-cv-pdf-renderer
intent: 001-one-click-tailored-cv
phase: inception
status: complete
unit_type: frontend
default_bolt_type: simple-construction-bolt
created: '2026-10-25T12:00:00Z'
updated: '2026-10-25T12:00:00Z'
---

# Unit Brief: 004-cv-pdf-renderer

## Purpose

Renders the validated tailoring plan and profile into a downloadable A4 PDF (max 2 pages) using `@react-pdf/renderer`, entirely inside the extension.

## Scope

### In Scope
- One cv-snap CV template (A4)
- Localized headings (built-in PL/EN; plan-provided for other languages)
- Photo
- Two-page fitting by rank
- Download + file naming
- RODO clause

### Out of Scope
- Additional templates/formats (future intent)
- Preview UI chrome (005)

---

## Assigned Requirements

**These FRs from the intent are assigned to this unit. Stories are created from these.**

| FR | Requirement | Priority |
|---|---|---|
| FR-14 | PDF rendering and download | Must |
| FR-15 | GDPR consent clause (klauzula RODO) | Should |

---

## Domain Concepts

### Key Entities
| Entity | Description | Attributes |
|---|---|---|
| RenderModel | Plan + profile flattened for the template | header, sections[], headings, photo?, clause? |
| FitResult | Outcome of page fitting | pages, droppedItemIds[] |

### Key Operations
| Operation | Description | Inputs | Outputs |
|---|---|---|---|
| renderCv | Produce PDF blob | plan, profile, settings | Blob |
| fitToTwoPages | Drop lowest-ranked items until ≤ 2 pages | RenderModel | FitResult |
| downloadCv | Save with naming rule | Blob, names | file |

---

## Story Summary

- **Total Stories**: 4
- **Must Have**: 3
- **Should Have**: 1
- **Could Have**: 0

### Stories

- [ ] **001-cv-pdf-template**: CV PDF template - Must - Planned
- [ ] **002-two-page-fit**: Two-page fit - Must - Planned
- [ ] **003-pdf-download-and-naming**: PDF download and naming - Must - Planned
- [ ] **004-gdpr-consent-clause**: GDPR consent clause (klauzula RODO) - Should - Planned

---

## Dependencies

### Depends On
| Unit | Reason |
|---|---|
| 001-cv-tailoring-core | TailoringPlan, CvProfile schemas |

### Depended By
| Unit | Reason |
|---|---|
| 005-tailored-cv-ui | Preview and download |

### External Dependencies
| System | Purpose | Risk |
|---|---|---|
| @react-pdf/renderer | PDF generation | Low |

---

## Technical Context

### Suggested Technology
React + `@react-pdf/renderer` in the extension; embedded fonts with full Polish/Latin Extended coverage (and a broad-coverage fallback font for other scripts).

### Integration Points
| Integration | Type | Protocol |
|---|---|---|
| 005-tailored-cv-ui | Function call | in-process |

### Data Storage
| Data | Type | Volume | Retention |
|---|---|---|---|
| Generated CV (session) | IndexedDB | 1 file | Current session |

---

## Constraints

- No PDF crosses native messaging
- Text must be selectable (ATS)

---

## Success Criteria

### Functional
- [ ] PDF ≤ 2 pages, A4, photo when present, clause per setting
- [ ] Dropped items reported to the user

### Non-Functional
- [ ] Render + download ≤ 3 s p95

### Quality
- [ ] Code coverage ~80% (shared/native-host) or most important user flows covered (extension), per coding standards
- [ ] All acceptance criteria met
- [ ] Code reviewed and approved

---

## Bolt Suggestions

| Bolt | Type | Stories | Objective |
|---|---|---|---|
| 009-cv-pdf-renderer | simple-construction-bolt | 001-cv-pdf-template, 002-two-page-fit, 003-pdf-download-and-naming, 004-gdpr-consent-clause | A4 CV template with localized headings, photo, two-page fitting, download naming and RODO clause. |

---

## Notes

Font choice matters: Polish diacritics and non-Latin ad languages must render correctly.
