---
unit: 003-history-backup
intent: 004-application-history
phase: inception
status: complete
unit_type: frontend
default_bolt_type: simple-construction-bolt
created: '2026-11-03T15:28:00Z'
updated: '2026-11-04T10:50:00Z'
---

# Unit Brief: 003-history-backup

## Purpose

Export includes history; import restores and merges it by `AdKey`; 0.1.x profile-only backups still import.

---

## Assigned Requirements

| FR | Requirement | Priority |
|---|---|---|
| FR-7 | History in the backup | Must |

---

## Story Summary

- **Total Stories**: 2
- **Must Have**: 2
- **Should Have**: 0
- **Could Have**: 0

### Stories

- [x] **001-export-with-history**: Export includes history - Must - Complete
- [x] **002-import-merges-history**: Import restores and merges history - Must - Complete

---

## Dependencies

- **Depends on**: 001-history-core, 002-history-ui (retention)
- **Depended by**: Operations (0.2.0)

---

## Success Criteria

- [x] All acceptance criteria met
- [x] Tests passing (`pnpm test`; `pnpm test:e2e` where E2E applies)
- [x] Code reviewed and approved

---

## Bolt Suggestions

- **026-history-backup**: both stories
