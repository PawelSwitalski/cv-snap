---
id: 012-tailored-cv-ui
unit: 005-tailored-cv-ui
intent: 001-one-click-tailored-cv
type: simple-construction-bolt
status: complete
stories:
  - 008-settings-panel
  - 009-profile-export-import
created: '2026-10-25T12:00:00Z'
started: '2026-10-29T14:57:35Z'
completed: '2026-10-29T15:40:59Z'
current_stage: null
stages_completed:
  - name: plan
    completed: '2026-10-29T15:07:51Z'
    artifact: implementation-plan.md
  - name: implement
    completed: '2026-10-29T15:20:19Z'
    artifact: implementation-walkthrough.md
  - name: test
    completed: '2026-10-29T15:40:59Z'
    artifact: test-walkthrough.md
requires_bolts:
  - 011-tailored-cv-ui
enables_bolts: []
requires_units: []
blocks: true
complexity:
  avg_complexity: 1
  avg_uncertainty: 1
  max_dependencies: 2
  testing_scope: 2
---

# Bolt: 012-tailored-cv-ui

## Overview

Settings (model, language, allowed sites, RODO clause, privacy) and profile export/import.

## Objective

Implement and test the stories below so that every acceptance criterion passes.

## Stories Included

- **008-settings-panel**: Settings panel (Must)
- **009-profile-export-import**: Profile export and import (Should)

## Bolt Type

**Type**: simple-construction-bolt
**Definition**: `.specsmd/aidlc/templates/construction/bolt-types/simple-construction-bolt.md`

## Stages

- [x] **1. plan**: Complete → implementation-plan.md
- [x] **2. implement**: Complete → source + implementation-walkthrough.md
- [x] **3. test**: Complete → tests + test-walkthrough.md

## Dependencies

### Requires
- 011-tailored-cv-ui

### Enables
- None (final bolt of the intent)

## Success Criteria

- [ ] All stories implemented
- [ ] All acceptance criteria met
- [ ] Tests passing
- [ ] Code reviewed

## Notes

None.
