---
unit: 002-history-only-mode
intent: 005-own-cv-in-history
phase: inception
status: complete
unit_type: frontend
default_bolt_type: simple-construction-bolt
created: '2026-11-04T16:40:00Z'
updated: '2026-11-04T20:20:00Z'
---

# Unit Brief: 002-history-only-mode

## Purpose

Use cv-snap without the helper: set up with a CV PDF only, save own CVs and use History; set up the helper later without losing history; backups without a profile; privacy text; E2E with no host.

---

## Assigned Requirements

| FR | Requirement | Priority |
|---|---|---|
| FR-5 | History-only mode without the helper | Must |
| FR-6 | Replace my stored CV | Should |
| FR-7 | Backups without a profile | Must |

---

## Story Summary

- **Total Stories**: 6
- **Must Have**: 5
- **Should Have**: 1
- **Could Have**: 0

### Stories

- [x] **001-history-only-onboarding**: Use without the helper - Must - Complete
- [x] **002-helper-later**: Set up the helper later - Must - Complete
- [x] **003-replace-stored-cv**: Replace my stored CV - Should - Complete
- [x] **004-backup-without-profile**: Backups without a profile - Must - Complete
- [x] **005-privacy-text**: Privacy text for own CVs - Must - Complete
- [x] **006-history-only-e2e**: E2E: history-only mode - Must - Complete

---

## Dependencies

- **Depends on**: 001-own-cv-save
- **Depended by**: Operations (next release)

---

## Success Criteria

- [x] All acceptance criteria met
- [x] Tests passing (`pnpm test`; `pnpm test:e2e` where E2E applies)
- [x] Code reviewed and approved

---

## Bolt Suggestions

- **029-history-only-mode**: 001, 002, 003
- **030-history-only-backup**: 004, 005, 006
