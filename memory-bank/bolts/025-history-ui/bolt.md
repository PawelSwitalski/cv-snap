---
id: 025-history-ui
unit: 002-history-ui
intent: 004-application-history
type: simple-construction-bolt
status: complete
stories:
  - 004-retention-setting
  - 005-privacy-notice-v2
created: '2026-11-03T15:28:00Z'
started: '2026-11-03T16:50:05Z'
completed: '2026-11-03T17:06:17Z'
current_stage: null
stages_completed:
  - name: plan
    completed: '2026-11-03T16:53:08Z'
    artifact: implementation-plan.md
  - name: implement
    completed: '2026-11-03T17:02:05Z'
    artifact: implementation-walkthrough.md
  - name: test
    completed: '2026-11-03T17:06:17Z'
    artifact: test-walkthrough.md
requires_bolts:
  - 024-history-ui
enables_bolts:
  - 026-history-backup
  - 027-e2e-tests
requires_units:
  - 001-history-core
blocks: false
complexity:
  avg_complexity: 2
  avg_uncertainty: 1
  max_dependencies: 1
  testing_scope: 2
---

# Bolt: 025-history-ui

## Overview

Retention setting with pruning and Delete all; privacy notice and policy v2.

## Objective

Implement and test the stories below so that every acceptance criterion passes.

## Stories Included

- **004-retention-setting**: Retention setting and pruning (Must)
- **005-privacy-notice-v2**: Privacy notice and policy v2 (Must)

## Bolt Type

**Type**: simple-construction-bolt
**Definition**: `.specsmd/aidlc/templates/construction/bolt-types/simple-construction-bolt.md`

## Stages

- [x] **1. plan**: Complete → implementation-plan.md (approved, user)
- [x] **2. implement**: Complete → source + implementation-walkthrough.md (approved, user)
- [x] **3. test**: Complete → tests + test-walkthrough.md (approved, user)

## Dependencies

### Requires
- 024-history-ui

### Enables
- 026-history-backup
- 027-e2e-tests

## Success Criteria

- [x] All stories implemented
- [x] All acceptance criteria met
- [x] `pnpm test` green
- [x] Code reviewed (user, stage checkpoints)
