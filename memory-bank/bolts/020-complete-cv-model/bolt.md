---
id: 020-complete-cv-model
unit: 001-complete-cv-model
intent: 003-complete-cv-content
type: simple-construction-bolt
status: complete
stories:
  - 001-education-always-printed
  - 002-all-skills-printed
  - 003-live-regression-education
created: '2026-11-02T18:45:00Z'
started: '2026-11-02T19:10:00Z'
completed: '2026-11-02T20:45:00Z'
current_stage: null
stages_completed:
  - name: plan
    completed: '2026-11-02T19:40:00Z'
    artifact: implementation-plan.md
  - name: implement
    completed: '2026-11-02T20:10:00Z'
    artifact: implementation-walkthrough.md
  - name: test
    completed: '2026-11-02T20:45:00Z'
    artifact: test-walkthrough.md
requires_bolts: []
enables_bolts:
  - 021-other-sections
requires_units: []
blocks: true
complexity:
  avg_complexity: 2
  avg_uncertainty: 1
  max_dependencies: 1
  testing_scope: 2
---

# Bolt: 020-complete-cv-model

## Overview

Defect fix for 0.1.0 (user report, 2026-11-02): education mostly disappears from the tailored CV
and some skills are missing, because both are printed only if the model selects them, and
education is the first ranked content dropped to fit two pages. Extension only.

## Objective

Implement and test the stories below so that every acceptance criterion passes.

## Stories Included

- **001-education-always-printed**: Every education entry is printed (Must)
- **002-all-skills-printed**: All skills printed, plan-selected first (Must)
- **003-live-regression-education**: Live regression checks education and skills (Must)

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
- 021-other-sections (shares the drop order in `fit-to-pages.ts`)

## Success Criteria

- [x] All stories implemented
- [x] All acceptance criteria met
- [x] `pnpm test` green (recorded plans incl. real sets locally); `pnpm test:live` not run (no prompt change; new recordings are checked by the same test)
- [x] Code reviewed (user, stage checkpoints)
