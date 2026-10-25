---
id: 012-tailored-cv-ui
unit: 005-tailored-cv-ui
intent: 001-one-click-tailored-cv
type: simple-construction-bolt
status: planned
stories:
  - 008-settings-panel
  - 009-profile-export-import
created: 2026-10-25T12:00:00Z
started: null
completed: null
current_stage: null
stages_completed: []

requires_bolts: [011-tailored-cv-ui]
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

- [ ] **1. plan**: Pending → implementation-plan.md
- [ ] **2. implement**: Pending → source + implementation-walkthrough.md
- [ ] **3. test**: Pending → tests + test-walkthrough.md

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
