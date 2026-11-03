---
id: 026-history-backup
unit: 003-history-backup
intent: 004-application-history
type: simple-construction-bolt
status: planned
stories:
  - 001-export-with-history
  - 002-import-merges-history
created: '2026-11-03T15:28:00Z'
started: null
completed: null
current_stage: null
stages_completed: []
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

- [ ] **1. plan**: Pending → implementation-plan.md
- [ ] **2. implement**: Pending → source + implementation-walkthrough.md
- [ ] **3. test**: Pending → tests + test-walkthrough.md

## Dependencies

### Requires
- 023-history-core
- 025-history-ui

### Enables
- Operations (release 0.2.0)

## Success Criteria

- [ ] All stories implemented
- [ ] All acceptance criteria met
- [ ] `pnpm test` green
- [ ] Code reviewed (user, stage checkpoints)
