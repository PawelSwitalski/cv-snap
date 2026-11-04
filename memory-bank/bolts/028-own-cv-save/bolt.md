---
id: 028-own-cv-save
unit: 001-own-cv-save
intent: 005-own-cv-in-history
type: simple-construction-bolt
status: complete
stories:
  - 001-entry-source
  - 002-save-own-cv
  - 003-save-own-cv-panel
created: '2026-11-04T16:40:00Z'
started: '2026-11-04T17:00:00Z'
completed: '2026-11-04T17:45:00Z'
current_stage: null
stages_completed:
  - name: plan
    completed: '2026-11-04T17:02:00Z'
    artifact: implementation-plan.md
  - name: implement
    completed: '2026-11-04T17:15:00Z'
    artifact: implementation-walkthrough.md
  - name: test
    completed: '2026-11-04T17:45:00Z'
    artifact: test-walkthrough.md
requires_bolts: []
enables_bolts:
  - 029-history-only-mode
requires_units: []
blocks: false
complexity:
  avg_complexity: 2
  avg_uncertainty: 2
  max_dependencies: 1
  testing_scope: 2
---

# Bolt: 028-own-cv-save

## Overview

Save the user's own CV for the current ad, offline, with the entry source and the replace rule.

## Objective

Implement and test the stories below so that every acceptance criterion passes.

## Stories Included

- **001-entry-source**: Entry source: your CV or tailored (Must)
- **002-save-own-cv**: Save my CV for an ad, without the host (Must)
- **003-save-own-cv-panel**: Save my CV in the panel (Must)

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
- 029-history-only-mode

## Success Criteria

- [x] All stories implemented
- [x] All acceptance criteria met
- [x] `pnpm test` green
- [x] Code reviewed (user, stage checkpoints)
