---
unit: 002-history-ui
intent: 004-application-history
phase: inception
status: complete
unit_type: frontend
default_bolt_type: simple-construction-bolt
created: '2026-11-03T15:28:00Z'
updated: '2026-11-03T15:28:00Z'
---

# Unit Brief: 002-history-ui

## Purpose

The History tab (list, search, filter, actions), mark as sent, the already-in-history hint, the retention setting with pruning, and the privacy notice/policy update.

---

## Assigned Requirements

| FR | Requirement | Priority |
|---|---|---|
| FR-3 | History tab | Must |
| FR-4 | Mark as sent | Must |
| FR-5 | Already-in-history hint | Should |
| FR-6 | Retention setting | Must |
| FR-8 | Privacy notice and policy updated | Must |

---

## Story Summary

- **Total Stories**: 5
- **Must Have**: 4
- **Should Have**: 1
- **Could Have**: 0

### Stories

- [x] **001-history-tab**: History tab: list, search, filter, actions - Must - Complete
- [x] **002-mark-as-sent**: Mark as sent with a date - Must - Complete
- [x] **003-already-in-history-hint**: Already-in-history hint in Generate - Should - Complete
- [x] **004-retention-setting**: Retention setting and pruning - Must - Complete
- [x] **005-privacy-notice-v2**: Privacy notice and policy v2 - Must - Complete

---

## Dependencies

- **Depends on**: 001-history-core
- **Depended by**: 003-history-backup (retention after import), 004-e2e-tests (history flow)

---

## Success Criteria

- [x] All acceptance criteria met
- [x] Tests passing (`pnpm test`; `pnpm test:e2e` where E2E applies)
- [x] Code reviewed and approved

---

## Bolt Suggestions

- **024-history-ui**: 001-history-tab, 002-mark-as-sent, 003-already-in-history-hint
- **025-history-ui**: 004-retention-setting, 005-privacy-notice-v2
