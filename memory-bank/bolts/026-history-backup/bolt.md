---
id: 026-history-backup
unit: 003-history-backup
intent: 004-application-history
type: simple-construction-bolt
status: complete
stories:
  - 001-export-with-history
  - 002-import-merges-history
created: '2026-11-03T15:28:00Z'
started: '2026-11-03T19:28:41Z'
completed: '2026-11-04T10:50:00Z'
current_stage: null
stages_completed:
  - name: plan
    completed: '2026-11-04T09:10:00Z'
    artifact: implementation-plan.md
  - name: implement
    completed: '2026-11-04T10:30:00Z'
    artifact: implementation-walkthrough.md
  - name: test
    completed: '2026-11-04T10:50:00Z'
    artifact: test-walkthrough.md
requires_bolts:
  - 023-history-core
  - 025-history-ui
enables_bolts: []
requires_units:
  - 001-history-core
  - 002-history-ui
blocks: false
complexity:
  avg_complexity: 2
  avg_uncertainty: 2
  max_dependencies: 1
  testing_scope: 2
---

# Bolt: 026-history-backup

## Overview

Backup includes history; import restores and merges it; legacy backups still import. Decides the backup format.

## Objective

Implement and test the stories below so that every acceptance criterion passes.

## Stories Included

- **001-export-with-history**: Export includes history (Must)
- **002-import-merges-history**: Import restores and merges history (Must)

## Bolt Type

**Type**: simple-construction-bolt
**Definition**: `.specsmd/aidlc/templates/construction/bolt-types/simple-construction-bolt.md`

## Stages

- [x] **1. plan**: Complete → implementation-plan.md (approved, user; format: single JSON, ZIP deferred)
- [x] **2. implement**: Complete → source + implementation-walkthrough.md (approved, user)
- [x] **3. test**: Complete → tests + test-walkthrough.md (approved, user)

## Dependencies

### Requires
- 023-history-core
- 025-history-ui

### Enables
- Operations (release 0.2.0)

## Success Criteria

- [x] All stories implemented
- [x] All acceptance criteria met
- [x] `pnpm test` green
- [x] Code reviewed (user, stage checkpoints)
