---
id: 024-history-ui
unit: 002-history-ui
intent: 004-application-history
type: simple-construction-bolt
status: planned
stories:
  - 001-history-tab
  - 002-mark-as-sent
  - 003-already-in-history-hint
created: '2026-11-03T15:28:00Z'
started: null
completed: null
current_stage: null
stages_completed: []
requires_bolts:
  - 023-history-core
enables_bolts:
  - 025-history-ui
requires_units:
  - 001-history-core
blocks: false
complexity:
  avg_complexity: 2
  avg_uncertainty: 1
  max_dependencies: 2
  testing_scope: 2
---

# Bolt: 024-history-ui

## Overview

The History tab with search, filter and actions; mark as sent; the already-in-history hint in Generate.

## Objective

Implement and test the stories below so that every acceptance criterion passes.

## Stories Included

- **001-history-tab**: History tab: list, search, filter, actions (Must)
- **002-mark-as-sent**: Mark as sent with a date (Must)
- **003-already-in-history-hint**: Already-in-history hint in Generate (Should)

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

### Enables
- 025-history-ui

## Success Criteria

- [ ] All stories implemented
- [ ] All acceptance criteria met
- [ ] `pnpm test` green
- [ ] Code reviewed (user, stage checkpoints)
