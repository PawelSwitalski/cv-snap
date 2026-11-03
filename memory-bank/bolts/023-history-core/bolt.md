---
id: 023-history-core
unit: 001-history-core
intent: 004-application-history
type: simple-construction-bolt
status: planned
stories:
  - 001-history-store
  - 002-save-on-download
  - 003-page-snapshot
  - 004-open-saved-files
created: '2026-11-03T15:40:00Z'
started: null
completed: null
current_stage: null
stages_completed: []
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

- [ ] **1. plan**: Pending → implementation-plan.md
- [ ] **2. implement**: Pending → source + implementation-walkthrough.md
- [ ] **3. test**: Pending → tests + test-walkthrough.md

## Dependencies

### Requires
- None

### Enables
- 024-history-ui
- 026-history-backup

## Success Criteria

- [ ] All stories implemented
- [ ] All acceptance criteria met
- [ ] `pnpm test` green
- [ ] Code reviewed (user, stage checkpoints)
