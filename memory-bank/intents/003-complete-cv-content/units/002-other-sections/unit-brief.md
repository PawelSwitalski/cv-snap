---
unit: 002-other-sections
intent: 003-complete-cv-content
phase: inception
status: complete
unit_type: frontend
default_bolt_type: simple-construction-bolt
created: '2026-11-02T18:45:00Z'
updated: '2026-11-02T22:05:00Z'
---

# Unit Brief: 002-other-sections

## Purpose

The plan may select relevant other sections (courses, volunteering, …); they are validated, printed with their title and lines, and dropped first to fit two pages.

---

## Assigned Requirements

| FR | Requirement | Priority |
|---|---|---|
| FR-3 | Other sections can be printed | Should |
| FR-4 | Fact validation still holds | Must |

---

## Story Summary

- **Total Stories**: 2
- **Must Have**: 1
- **Should Have**: 1
- **Could Have**: 0

### Stories

- [x] **001-plan-selects-other-sections**: Plan selects other sections, validator checks them - Must - Complete
- [x] **002-other-sections-in-cv**: Selected other sections printed, dropped first - Should - Complete

---

## Dependencies

- **Depends on**: 001-complete-cv-model (drop order)
- **Depended by**: Operations (release 0.1.1)

---

## Success Criteria

- [x] All acceptance criteria met
- [x] Tests passing (unit; `pnpm test:live` for the regression check)
- [x] Code reviewed and approved

---

## Bolt Suggestions

- **021-other-sections**: both stories (shared schema, prompt and validator + extension rendering)
