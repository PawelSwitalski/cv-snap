---
unit: 001-own-cv-save
intent: 005-own-cv-in-history
phase: inception
status: complete
unit_type: frontend
default_bolt_type: simple-construction-bolt
created: '2026-11-04T16:40:00Z'
updated: '2026-11-04T17:45:00Z'
---

# Unit Brief: 001-own-cv-save

## Purpose

Save the user's own CV (stored or picked) for the current ad, with offline title and company; entries show their source; one entry per ad across both kinds.

---

## Assigned Requirements

| FR | Requirement | Priority |
|---|---|---|
| FR-1 | Save my CV for the current ad | Must |
| FR-2 | Title and company without AI | Must |
| FR-3 | Which CV an entry holds | Must |
| FR-4 | One entry per ad, either kind | Must |

---

## Story Summary

- **Total Stories**: 3
- **Must Have**: 3
- **Should Have**: 0
- **Could Have**: 0

### Stories

- [x] **001-entry-source**: Entry source: your CV or tailored - Must - Complete
- [x] **002-save-own-cv**: Save my CV for an ad, without the host - Must - Complete
- [x] **003-save-own-cv-panel**: Save my CV in the panel - Must - Complete

---

## Dependencies

- **Depends on**: None
- **Depended by**: 002-history-only-mode

---

## Success Criteria

- [x] All acceptance criteria met
- [x] Tests passing (`pnpm test`; `pnpm test:e2e` where E2E applies)
- [x] Code reviewed and approved

---

## Bolt Suggestions

- **028-own-cv-save**: all three stories
