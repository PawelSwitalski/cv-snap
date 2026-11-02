---
unit: 001-complete-cv-model
intent: 003-complete-cv-content
phase: inception
status: complete
unit_type: frontend
default_bolt_type: simple-construction-bolt
created: '2026-11-02T18:45:00Z'
updated: '2026-11-02T20:45:00Z'
---

# Unit Brief: 001-complete-cv-model

## Purpose

The CV model always prints every education entry and every profile skill (plan-selected first); the two-page fit never drops education entries and drops non-selected skills last. Extension only.

---

## Assigned Requirements

| FR | Requirement | Priority |
|---|---|---|
| FR-1 | Education is always printed | Must |
| FR-2 | All skills are printed, relevant ones first | Must |
| FR-5 | Regression coverage | Must |

---

## Story Summary

- **Total Stories**: 3
- **Must Have**: 3
- **Should Have**: 0
- **Could Have**: 0

### Stories

- [x] **001-education-always-printed**: Every education entry is printed - Must - Complete
- [x] **002-all-skills-printed**: All skills printed, plan-selected first - Must - Complete
- [x] **003-live-regression-education**: Live regression checks education - Must - Complete

---

## Dependencies

- **Depends on**: None
- **Depended by**: 002-other-sections (drop order)

---

## Success Criteria

- [x] All acceptance criteria met
- [x] Tests passing (unit; `pnpm test:live` for the regression check)
- [x] Code reviewed and approved

---

## Bolt Suggestions

- **020-complete-cv-model**: all three stories (one bolt, extension only)
