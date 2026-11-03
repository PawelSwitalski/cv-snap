---
unit: 001-history-core
intent: 004-application-history
phase: inception
status: complete
unit_type: frontend
default_bolt_type: simple-construction-bolt
created: '2026-11-03T15:28:00Z'
updated: '2026-11-03T15:28:00Z'
---

# Unit Brief: 001-history-core

## Purpose

History entry model and IndexedDB store, saving on Download PDF (one entry per `AdKey`), the cleaned job-ad page snapshot, and opening a saved PDF or page safely.

---

## Assigned Requirements

| FR | Requirement | Priority |
|---|---|---|
| FR-1 | Download saves the CV to history | Must |
| FR-2 | Cleaned snapshot of the job-ad page | Must |

---

## Story Summary

- **Total Stories**: 4
- **Must Have**: 4
- **Should Have**: 0
- **Could Have**: 0

### Stories

- [x] **001-history-store**: History entry model and store - Must - Complete
- [x] **002-save-on-download**: Download PDF saves the entry - Must - Complete
- [x] **003-page-snapshot**: Cleaned snapshot of the job-ad page - Must - Complete
- [x] **004-open-saved-files**: Open a saved PDF or page - Must - Complete

---

## Dependencies

- **Depends on**: None
- **Depended by**: 002-history-ui, 003-history-backup, 004-e2e-tests (history flow)

---

## Success Criteria

- [x] All acceptance criteria met
- [x] Tests passing (`pnpm test`; `pnpm test:e2e` where E2E applies)
- [x] Code reviewed and approved

---

## Bolt Suggestions

- **023-history-core**: all four stories
