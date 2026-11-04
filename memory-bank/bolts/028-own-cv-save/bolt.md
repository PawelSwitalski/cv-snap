---
id: 028-own-cv-save
unit: 001-own-cv-save
intent: 005-own-cv-in-history
type: simple-construction-bolt
status: planned
stories:
  - 001-entry-source
  - 002-save-own-cv
  - 003-save-own-cv-panel
created: '2026-11-04T16:40:00Z'
started: null
completed: null
current_stage: null
stages_completed: []
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

- [ ] **1. plan**: Pending → implementation-plan.md
- [ ] **2. implement**: Pending → source + implementation-walkthrough.md
- [ ] **3. test**: Pending → tests + test-walkthrough.md

## Dependencies

### Requires
- None

### Enables
- 029-history-only-mode

## Success Criteria

- [ ] All stories implemented
- [ ] All acceptance criteria met
- [ ] `pnpm test` green
- [ ] Code reviewed (user, stage checkpoints)
