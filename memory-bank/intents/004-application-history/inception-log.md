---
intent: 004-application-history
created: 2026-11-03T15:13:06Z
completed: 2026-11-03T15:29:34Z
status: complete
---

# Inception Log: application-history

## Overview

**Intent**: Local history of tailored CVs per job ad, "mark as sent", saved job-ad page, Playwright E2E
**Type**: brown-field
**Created**: 2026-11-03T15:13:06Z

## Artifacts Created

| Artifact | Status | File |
|----------|--------|------|
| Requirements | ✅ | requirements.md |
| System Context | ✅ | system-context.md |
| Units | ✅ | units.md |
| Stories | ✅ | units/*/stories/*.md (16) |
| Bolt Plan | ✅ | memory-bank/bolts/022–027 (6) |

## Summary

| Metric | Count |
|--------|-------|
| Functional Requirements | 11 |
| Non-Functional Requirements | 4 |
| Units | 4 |
| Stories | 16 |
| Bolts Planned | 6 |

## Units Breakdown

| Unit | Stories | Bolts | Priority |
|------|---------|-------|----------|
| 001-history-core | 4 | 1 (023) | Must |
| 002-history-ui | 5 | 2 (024, 025) | Must |
| 003-history-backup | 2 | 1 (026) | Must |
| 004-e2e-tests | 5 | 2 (022, 027) | Must |

## Decision Log

| Date | Decision | Rationale | Approved |
|------|----------|-----------|----------|
| 2026-11-02 | Scope: history + mark as sent + Playwright E2E (from the 0.2.0 split in intent 003) | Each intent releases on its own | Yes |
| 2026-11-02 | "Save HTML" means the job-ad page; Playwright runs in CI on Ubuntu and locally, with a fake AI provider | User choice | Yes |
| 2026-11-03 | Entry keeps the final PDF + ad (not a re-editable result) | User choice | Yes |
| 2026-11-03 | Mark as sent = sent + date | User choice | Yes |
| 2026-11-03 | New History tab in the side panel | User choice | Yes |
| 2026-11-03 | Retention is a setting: keep forever or delete after N months; history is in the backup | User choice | Yes |
| 2026-11-03 | Entry created on Download PDF; one entry per ad, re-download replaces the PDF | User choice | Yes |
| 2026-11-03 | Job-ad page saved as a cleaned HTML snapshot (scripts removed, no new permission) | User choice | Yes |
| 2026-11-03 | E2E covers the one-click flow and the history flow | User choice | Yes |
| 2026-11-03 | Requirements approved (Checkpoint 2) | | Yes |
| 2026-11-03 | 4 units, 16 stories, bolts 022–027; E2E harness (022) first: highest uncertainty, safety net for the Generate flow | Risk first | Yes |
| 2026-11-03 | Artifacts approved (Checkpoint 3) | | Yes |

## Scope Changes

| Date | Change | Reason | Impact |
|------|--------|--------|--------|

## Ready for Construction

**Checklist**:
- [x] All requirements documented
- [x] System context defined
- [x] Units decomposed
- [x] Stories created for all units
- [x] Bolts planned
- [x] Human review complete

## Next Steps

1. Begin Construction Phase
2. Start with bolt `022-e2e-tests` (unit `004-e2e-tests`)
3. Execute: `/specsmd-construction-agent --unit="004-e2e-tests"`

## Dependencies

022-e2e-tests → 023-history-core → 024-history-ui → 025-history-ui → 026-history-backup → 027-e2e-tests → Operations (release 0.2.0, both packages)

(022 and 023 are independent; 027 needs 022 and 025.)
