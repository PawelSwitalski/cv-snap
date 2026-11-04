---
id: 029-history-only-mode
unit: 002-history-only-mode
intent: 005-own-cv-in-history
type: simple-construction-bolt
status: complete
stories:
  - 001-history-only-onboarding
  - 002-helper-later
  - 003-replace-stored-cv
created: '2026-11-04T16:40:00Z'
started: '2026-11-04T18:00:00Z'
completed: '2026-11-04T19:05:00Z'
current_stage: null
stages_completed:
  - name: plan
    completed: '2026-11-04T18:05:00Z'
    artifact: implementation-plan.md
  - name: implement
    completed: '2026-11-04T18:35:00Z'
    artifact: implementation-walkthrough.md
  - name: test
    completed: '2026-11-04T19:05:00Z'
    artifact: test-walkthrough.md
requires_bolts:
  - 028-own-cv-save
enables_bolts:
  - 030-history-only-backup
requires_units:
  - 001-own-cv-save
blocks: false
complexity:
  avg_complexity: 2
  avg_uncertainty: 2
  max_dependencies: 1
  testing_scope: 2
---

# Bolt: 029-history-only-mode

## Overview

History-only mode: onboarding without the helper, switching to the helper later, replacing the stored CV.

## Objective

Implement and test the stories below so that every acceptance criterion passes.

## Stories Included

- **001-history-only-onboarding**: Use without the helper (Must)
- **002-helper-later**: Set up the helper later (Must)
- **003-replace-stored-cv**: Replace my stored CV (Should)

## Bolt Type

**Type**: simple-construction-bolt
**Definition**: `.specsmd/aidlc/templates/construction/bolt-types/simple-construction-bolt.md`

## Stages

- [x] **1. plan**: Complete → implementation-plan.md (approved, user)
- [x] **2. implement**: Complete → source + implementation-walkthrough.md (approved, user)
- [x] **3. test**: Complete → tests + test-walkthrough.md (approved, user)

## Dependencies

### Requires
- 028-own-cv-save

### Enables
- 030-history-only-backup

## Success Criteria

- [x] All stories implemented
- [x] All acceptance criteria met
- [x] `pnpm test` green
- [x] Code reviewed (user, stage checkpoints)
