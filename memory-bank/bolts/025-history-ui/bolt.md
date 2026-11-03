---
id: 025-history-ui
unit: 002-history-ui
intent: 004-application-history
type: simple-construction-bolt
status: planned
stories:
  - 004-retention-setting
  - 005-privacy-notice-v2
created: '2026-11-03T15:28:00Z'
started: null
completed: null
current_stage: null
stages_completed: []
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

- [ ] **1. plan**: Pending → implementation-plan.md
- [ ] **2. implement**: Pending → source + implementation-walkthrough.md
- [ ] **3. test**: Pending → tests + test-walkthrough.md

## Dependencies

### Requires
- 024-history-ui

### Enables
- 026-history-backup
- 027-e2e-tests

## Success Criteria

- [ ] All stories implemented
- [ ] All acceptance criteria met
- [ ] `pnpm test` green
- [ ] Code reviewed (user, stage checkpoints)
