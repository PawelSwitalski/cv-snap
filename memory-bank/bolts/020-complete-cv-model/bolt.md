---
id: 020-complete-cv-model
unit: 001-complete-cv-model
intent: 003-complete-cv-content
type: simple-construction-bolt
status: planned
stories:
  - 001-education-always-printed
  - 002-all-skills-printed
  - 003-live-regression-education
created: '2026-11-02T18:45:00Z'
started: null
completed: null
current_stage: null
stages_completed: []
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

- [ ] **1. plan**: Pending → implementation-plan.md
- [ ] **2. implement**: Pending → source + implementation-walkthrough.md
- [ ] **3. test**: Pending → tests + test-walkthrough.md

## Dependencies

### Requires
- None

### Enables
- 021-other-sections (shares the drop order in `fit-to-pages.ts`)

## Success Criteria

- [ ] All stories implemented
- [ ] All acceptance criteria met
- [ ] `pnpm test` green; `pnpm test:live` green on the fixtures
- [ ] Code reviewed
