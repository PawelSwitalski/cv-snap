---
id: 006-cv-tailoring-core
unit: 001-cv-tailoring-core
intent: 001-one-click-tailored-cv
type: ddd-construction-bolt
status: planned
stories:
  - 006-deterministic-validator
  - 007-generation-pipeline-with-retry
  - 008-regression-fixture-suite
created: 2026-10-25T12:00:00Z
started: null
completed: null
current_stage: null
stages_completed: []

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

- [ ] **1. model**: Pending → ddd-01-domain-model.md
- [ ] **2. design**: Pending → ddd-02-technical-design.md
- [ ] **3. adr**: Pending → adr-*.md (optional)
- [ ] **4. implement**: Pending → source code
- [ ] **5. test**: Pending → ddd-03-test-report.md

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
