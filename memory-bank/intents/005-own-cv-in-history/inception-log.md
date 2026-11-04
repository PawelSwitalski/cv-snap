---
intent: 005-own-cv-in-history
created: 2026-11-04T16:00:00Z
completed: 2026-11-04T16:50:00Z
status: complete
---

# Inception Log: own-cv-in-history

## Overview

**Intent**: Save the user's own CV (not AI-generated) to the history for a job ad, without the helper or Claude
**Type**: brown-field
**Created**: 2026-11-04T16:00:00Z

## Artifacts Created

| Artifact | Status | File |
|----------|--------|------|
| Requirements | ✅ | requirements.md |
| System Context | ✅ | system-context.md |
| Units | ✅ | units.md, units/*/unit-brief.md (2) |
| Stories | ✅ | units/*/stories/*.md (9) |
| Bolt Plan | ✅ | memory-bank/bolts/028–030 (3) |

## Decision Log

| Date | Decision | Rationale | Approved |
|------|----------|-----------|----------|
| 2026-11-04 | New intent 005 (not reopening 004) | 004 is complete and released as 0.2.0 | Yes |
| 2026-11-04 | CV file: stored original by default, plus Choose another PDF | Checkpoint 1 | Yes (user) |
| 2026-11-04 | Helper optional: history-only mode, tailoring locked | Checkpoint 1 | Yes (user) |
| 2026-11-04 | Same ad: replace, one entry per ad; entry shows its source | Checkpoint 1 | Yes (user) |
| 2026-11-04 | Requirements approved (FR-1–FR-7) | Checkpoint 2 | Yes (user) |
| 2026-11-04 | Two units, three bolts (028 save, 029 mode, 030 backup + privacy + E2E) | Save works on its own first; the mode builds on it | Yes (user) |

## Summary

| Metric | Count |
|--------|-------|
| Functional Requirements | 7 |
| Non-Functional Requirements | 4 groups (privacy, performance, compatibility, testing) |
| Units | 2 |
| Stories | 9 |
| Bolts Planned | 3 |

## Units Breakdown

| Unit | Stories | Bolts | Priority |
|------|---------|-------|----------|
| 001-own-cv-save | 3 | 1 (028) | Must |
| 002-history-only-mode | 6 | 2 (029, 030) | Must |

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
2. Start with Unit: 001-own-cv-save (bolt 028-own-cv-save)

## Scope Changes

| Date | Change | Reason | Impact |
|------|--------|--------|--------|
