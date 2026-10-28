---
id: 006-cv-tailoring-core
unit: 001-cv-tailoring-core
intent: 001-one-click-tailored-cv
type: ddd-construction-bolt
status: in-progress
stories:
  - 006-deterministic-validator
  - 007-generation-pipeline-with-retry
  - 008-regression-fixture-suite
created: 2026-10-25T12:00:00Z
started: 2026-10-28T06:43:47Z
completed: null
current_stage: test
stages_completed:
  - name: model
    completed: 2026-10-28T07:05:27Z
    artifact: ddd-01-domain-model.md
  - name: design
    completed: 2026-10-28T11:52:24Z
    artifact: ddd-02-technical-design.md
  - name: adr
    completed: 2026-10-28T11:52:24Z
    artifact: "none (ADR stage skipped by user)"
  - name: implement
    completed: 2026-10-28T19:08:38Z
    artifact: source code (merged into main working tree)

requires_bolts: [005-cv-tailoring-core]
enables_bolts: [011-tailored-cv-ui]
requires_units: []
blocks: true

complexity:
  avg_complexity: 3
  avg_uncertainty: 2
  max_dependencies: 2
  testing_scope: 3
---

# Bolt: 006-cv-tailoring-core

## Overview

Deterministic anti-hallucination validator, pipeline orchestration with one retry, and the regression suite proving 0 fabrications.

## Objective

Implement and test the stories below so that every acceptance criterion passes.

## Stories Included

- **006-deterministic-validator**: Deterministic validator (Must)
- **007-generation-pipeline-with-retry**: Generation pipeline with retry (Must)
- **008-regression-fixture-suite**: Regression fixture suite (Must)

## Bolt Type

**Type**: ddd-construction-bolt
**Definition**: `.specsmd/aidlc/templates/construction/bolt-types/ddd-construction-bolt.md`

## Stages

- [x] **1. model**: Complete → ddd-01-domain-model.md
- [x] **2. design**: Complete → ddd-02-technical-design.md
- [x] **3. adr**: Skipped (no ADRs)
- [x] **4. implement**: Complete → source code
- [ ] **5. test**: In progress (waiting for the user's real regression set) → ddd-03-test-report.md

## Dependencies

### Requires
- 005-cv-tailoring-core

### Enables
- 011-tailored-cv-ui

## Success Criteria

- [ ] All stories implemented
- [ ] All acceptance criteria met
- [ ] Tests passing
- [ ] Code reviewed

## Notes

⚠️ Needs the project author's fixture set (≥ 3 CVs, ≥ 20 ads) before starting.
