---
id: 023-history-core
unit: 001-history-core
intent: 004-application-history
type: simple-construction-bolt
status: complete
stories:
  - 001-history-store
  - 002-save-on-download
  - 003-page-snapshot
  - 004-open-saved-files
created: '2026-11-03T15:28:00Z'
started: '2026-11-03T16:00:39Z'
completed: '2026-11-03T16:27:05Z'
current_stage: null
stages_completed:
  - name: plan
    completed: '2026-11-03T16:04:41Z'
    artifact: implementation-plan.md
  - name: implement
    completed: '2026-11-03T16:19:38Z'
    artifact: implementation-walkthrough.md
  - name: test
    completed: '2026-11-03T16:27:05Z'
    artifact: test-walkthrough.md
requires_bolts: []
enables_bolts:
  - 024-history-ui
  - 026-history-backup
requires_units: []
blocks: false
complexity:
  avg_complexity: 2
  avg_uncertainty: 2
  max_dependencies: 2
  testing_scope: 2
---

# Bolt: 023-history-core

## Overview

History model and IndexedDB store, saving on Download PDF, the cleaned page snapshot, and opening saved files safely.

## Objective

Implement and test the stories below so that every acceptance criterion passes.

## Stories Included

- **001-history-store**: History entry model and store (Must)
- **002-save-on-download**: Download PDF saves the entry (Must)
- **003-page-snapshot**: Cleaned snapshot of the job-ad page (Must)
- **004-open-saved-files**: Open a saved PDF or page (Must)

## Bolt Type

**Type**: simple-construction-bolt
**Definition**: `.specsmd/aidlc/templates/construction/bolt-types/simple-construction-bolt.md`

## Stages

- [x] **1. plan**: Complete → implementation-plan.md (approved, user)
- [x] **2. implement**: Complete → source + implementation-walkthrough.md (approved, user)
- [x] **3. test**: Complete → tests + test-walkthrough.md (approved, user)

## Dependencies

### Requires
- None

### Enables
- 024-history-ui
- 026-history-backup

## Success Criteria

- [x] All stories implemented
- [x] All acceptance criteria met
- [x] `pnpm test` green
- [x] Code reviewed (user, stage checkpoints)
