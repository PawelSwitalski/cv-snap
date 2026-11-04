---
id: 030-history-only-backup
unit: 002-history-only-mode
intent: 005-own-cv-in-history
type: simple-construction-bolt
status: complete
stories:
  - 004-backup-without-profile
  - 005-privacy-text
  - 006-history-only-e2e
created: '2026-11-04T16:40:00Z'
started: '2026-11-04T19:15:00Z'
completed: '2026-11-04T20:20:00Z'
current_stage: null
stages_completed:
  - name: plan
    completed: '2026-11-04T19:20:00Z'
    artifact: implementation-plan.md
  - name: implement
    completed: '2026-11-04T19:55:00Z'
    artifact: implementation-walkthrough.md
  - name: test
    completed: '2026-11-04T20:20:00Z'
    artifact: test-walkthrough.md
requires_bolts:
  - 029-history-only-mode
enables_bolts: []
requires_units:
  - 001-own-cv-save
blocks: false
complexity:
  avg_complexity: 2
  avg_uncertainty: 2
  max_dependencies: 1
  testing_scope: 2
---

# Bolt: 030-history-only-backup

## Overview

Backups without a profile, the privacy text, and the E2E test with no host.

## Objective

Implement and test the stories below so that every acceptance criterion passes.

## Stories Included

- **004-backup-without-profile**: Backups without a profile (Must)
- **005-privacy-text**: Privacy text for own CVs (Must)
- **006-history-only-e2e**: E2E: history-only mode (Must)

## Bolt Type

**Type**: simple-construction-bolt
**Definition**: `.specsmd/aidlc/templates/construction/bolt-types/simple-construction-bolt.md`

## Stages

- [x] **1. plan**: Complete → implementation-plan.md (approved, user; decisions 1–3 as proposed)
- [x] **2. implement**: Complete → source + implementation-walkthrough.md (approved, user)
- [x] **3. test**: Complete → tests + test-walkthrough.md (approved, user)

## Dependencies

### Requires
- 029-history-only-mode

### Enables
- Operations (next release)

## Success Criteria

- [x] All stories implemented
- [x] All acceptance criteria met
- [x] `pnpm test` green and `pnpm test:e2e` green
- [x] Code reviewed (user, stage checkpoints)
