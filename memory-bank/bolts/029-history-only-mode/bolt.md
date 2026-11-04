---
id: 029-history-only-mode
unit: 002-history-only-mode
intent: 005-own-cv-in-history
type: simple-construction-bolt
status: planned
stories:
  - 001-history-only-onboarding
  - 002-helper-later
  - 003-replace-stored-cv
created: '2026-11-04T16:40:00Z'
started: null
completed: null
current_stage: null
stages_completed: []
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

- [ ] **1. plan**: Pending → implementation-plan.md
- [ ] **2. implement**: Pending → source + implementation-walkthrough.md
- [ ] **3. test**: Pending → tests + test-walkthrough.md

## Dependencies

### Requires
- 028-own-cv-save

### Enables
- 030-history-only-backup

## Success Criteria

- [ ] All stories implemented
- [ ] All acceptance criteria met
- [ ] `pnpm test` green
- [ ] Code reviewed (user, stage checkpoints)
