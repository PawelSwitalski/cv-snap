---
unit: 005-tailored-cv-ui
intent: 001-one-click-tailored-cv
phase: inception
status: in-progress
unit_type: frontend
default_bolt_type: simple-construction-bolt
created: 2026-10-25T12:00:00Z
updated: 2026-10-29T13:03:10Z
---

# Unit Brief: 005-tailored-cv-ui

## Purpose

The side panel application that ties everything together: onboarding, profile management, one-click generation, preview/editing, errors, settings, and export/import.

## Scope

### In Scope
- Side panel shell, theme, i18n (PL/EN), Zustand stores
- Onboarding with privacy notice and health check
- CV upload + profile creation + review editor
- Generate flow, progress, cancel
- Preview with requirements, gaps, unverified markers, editing, language override
- Error messages and recovery
- Settings (model, UI language, allowed sites, RODO clause, privacy notice)
- Export/Import

### Out of Scope
- Domain logic (001)
- Host (002)
- Page capture internals (003)
- PDF internals (004)

---

## Assigned Requirements

**These FRs from the intent are assigned to this unit. Stories are created from these.**

| FR | Requirement | Priority |
|---|---|---|
| FR-2 | First-run onboarding and privacy notice | Must |
| FR-5 | Profile review and editing | Must |
| FR-13 | Preview and editing | Must |
| FR-16 | Progress and cancel | Must |
| FR-17 | Error handling and recovery | Must |
| FR-18 | Profile Export / Import | Should |
| FR-19 | UI localization (PL/EN) | Should |

---

## Domain Concepts

### Key Entities
| Entity | Description | Attributes |
|---|---|---|
| Settings | User preferences | model, uiLanguage, rodoMode, rodoText{pl,en}, privacyAckVersion |
| GenerationSession | Current generation state | status, progress, requirements, plan, validation, edits, droppedItems |

### Key Operations
| Operation | Description | Inputs | Outputs |
|---|---|---|---|
| startGeneration / cancel | Drive the pipeline | - | session updates |
| editLine / removeItem | Preview edits | lineId, text | updated session |
| exportProfile / importProfile | Backup | file | profile |

---

## Story Summary

- **Total Stories**: 9
- **Must Have**: 8
- **Should Have**: 1
- **Could Have**: 0

### Stories

- [ ] **001-side-panel-shell-and-localization**: Side panel shell and localization - Must - Planned
- [ ] **002-onboarding-and-privacy-notice**: Onboarding and privacy notice - Must - Planned
- [ ] **003-cv-upload-and-profile-creation**: CV upload and profile creation - Must - Planned
- [ ] **004-profile-review-editor**: Profile review editor - Must - Planned
- [ ] **005-generate-flow-with-progress-and-cancel**: Generate flow with progress and cancel - Must - Planned
- [ ] **006-preview-and-editing**: Preview and editing - Must - Planned
- [ ] **007-error-messages-and-recovery**: Error messages and recovery - Must - Planned
- [ ] **008-settings-panel**: Settings panel - Must - Planned
- [ ] **009-profile-export-import**: Profile export and import - Should - Planned

---

## Dependencies

### Depends On
| Unit | Reason |
|---|---|
| 001-cv-tailoring-core | Pipeline, schemas |
| 002-native-host | Health check, PDF extraction |
| 003-job-ad-capture | Ad capture, allowed sites |
| 004-cv-pdf-renderer | Preview/PDF |

### Depended By
| Unit | Reason |
|---|---|
| None | Top-level unit |

### External Dependencies
| System | Purpose | Risk |
|---|---|---|
| Chrome side panel / i18n APIs | UI platform | Low |

---

## Technical Context

### Suggested Technology
React, Tailwind CSS, shadcn/ui, Zustand (store per feature), `chrome.i18n` with an in-app override, WCAG 2.1 AA (see standards/ux-guide.md).

### Integration Points
| Integration | Type | Protocol |
|---|---|---|
| Background worker | Messaging | chrome.runtime |
| 004-cv-pdf-renderer | Function call | in-process |

### Data Storage
| Data | Type | Volume | Retention |
|---|---|---|---|
| Settings, profile | chrome.storage.local | Small | Persistent |
| PDF, photo | IndexedDB | Few MB | Persistent / session |

---

## Constraints

- No hard-coded user-facing strings
- Every async state has an exit (no stuck spinners)

---

## Success Criteria

### Functional
- [ ] First run to first generated CV works end to end
- [ ] Every error code has a PL/EN message with fix hint

### Non-Functional
- [ ] Side panel interactive ≤ 500 ms
- [ ] WCAG 2.1 AA checks pass (axe) on main views

### Quality
- [ ] Code coverage ~80% (shared/native-host) or most important user flows covered (extension), per coding standards
- [ ] All acceptance criteria met
- [ ] Code reviewed and approved

---

## Bolt Suggestions

| Bolt | Type | Stories | Objective |
|---|---|---|---|
| 010-tailored-cv-ui | simple-construction-bolt | 001-side-panel-shell-and-localization, 002-onboarding-and-privacy-notice, 003-cv-upload-and-profile-creation, 004-profile-review-editor | Side panel shell with i18n, onboarding (privacy + health), CV upload and the profile review editor. |
| 011-tailored-cv-ui | simple-construction-bolt | 005-generate-flow-with-progress-and-cancel, 006-preview-and-editing, 007-error-messages-and-recovery | The one-click experience: generate, progress/cancel, preview with gaps and unverified markers, editing, download, and error recovery. |
| 012-tailored-cv-ui | simple-construction-bolt | 008-settings-panel, 009-profile-export-import | Settings (model, language, allowed sites, RODO clause, privacy) and profile export/import. |

---

## Notes

UI language follows the browser with an override; CV language is separate and follows the ad.
