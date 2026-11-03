---
unit: 001-history-core
intent: 004-application-history
phase: inception
status: stories-defined
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

- [ ] **001-history-store**: History entry model and store - Must - Planned
- [ ] **002-save-on-download**: Download PDF saves the entry - Must - Planned
- [ ] **003-page-snapshot**: Cleaned snapshot of the job-ad page - Must - Planned
- [ ] **004-open-saved-files**: Open a saved PDF or page - Must - Planned

---

## Dependencies

- **Depends on**: None
- **Depended by**: 002-history-ui, 003-history-backup, 004-e2e-tests (history flow)

---

## Success Criteria

- [ ] All acceptance criteria met
- [ ] Tests passing (`pnpm test`; `pnpm test:e2e` where E2E applies)
- [ ] Code reviewed and approved

---

## Bolt Suggestions

- **023-history-core**: all four stories
