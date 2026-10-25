---
id: 002-cv-tailoring-core
unit: 001-cv-tailoring-core
intent: 001-one-click-tailored-cv
type: simple-construction-bolt
status: complete
stories:
  - 001-monorepo-scaffold
  - 002-domain-schemas-and-contracts
created: '2026-10-25T12:00:00Z'
started: '2026-10-25T17:51:57Z'
completed: '2026-10-25T18:42:14Z'
current_stage: null
stages_completed:
  - name: plan
    completed: '2026-10-25T17:57:36Z'
    artifact: implementation-plan.md
  - name: implement
    completed: '2026-10-25T18:32:22Z'
    artifact: implementation-walkthrough.md
  - name: test
    completed: '2026-10-25T18:42:14Z'
    artifact: test-walkthrough.md
requires_bolts:
  - 001-native-host
enables_bolts:
  - 003-native-host
  - 007-job-ad-capture
  - 009-cv-pdf-renderer
requires_units:
  - 002-native-host
blocks: true
complexity:
  avg_complexity: 2
  avg_uncertainty: 1
  max_dependencies: 1
  testing_scope: 1
---

# Bolt: 002-cv-tailoring-core

## Overview

Create the pnpm monorepo with all tooling and the shared contracts every other unit builds on.

## Objective

Implement and test the stories below so that every acceptance criterion passes.

## Stories Included

- **001-monorepo-scaffold**: Monorepo scaffold (Must)
- **002-domain-schemas-and-contracts**: Domain schemas and contracts (Must)

## Bolt Type

**Type**: simple-construction-bolt
**Definition**: `.specsmd/aidlc/templates/construction/bolt-types/simple-construction-bolt.md`

## Stages

- [x] **1. plan**: Complete → implementation-plan.md
- [x] **2. implement**: Complete → source + implementation-walkthrough.md
- [x] **3. test**: Complete → tests + test-walkthrough.md

## Dependencies

### Requires
- 001-native-host

### Enables
- 003-native-host
- 007-job-ad-capture
- 009-cv-pdf-renderer

## Success Criteria

- [ ] All stories implemented
- [ ] All acceptance criteria met
- [ ] Tests passing
- [ ] Code reviewed

## Notes

Simple bolt even though the unit defaults to DDD: scaffold + type definitions don't need domain modelling stages.
