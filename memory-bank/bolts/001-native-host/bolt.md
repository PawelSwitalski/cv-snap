---
id: 001-native-host
unit: 002-native-host
intent: 001-one-click-tailored-cv
type: simple-construction-bolt
status: complete
stories:
  - 001-claude-code-headless-spike
created: '2026-10-25T12:00:00Z'
started: '2026-10-25T17:25:48Z'
completed: '2026-10-25T17:49:04Z'
current_stage: null
stages_completed:
  - name: plan
    completed: '2026-10-25T17:34:45Z'
    artifact: implementation-plan.md
  - name: implement
    completed: '2026-10-25T17:46:00Z'
    artifact: implementation-walkthrough.md
  - name: test
    completed: '2026-10-25T17:48:51Z'
    artifact: test-walkthrough.md
requires_bolts: []
enables_bolts:
  - 002-cv-tailoring-core
requires_units: []
blocks: false
complexity:
  avg_complexity: 2
  avg_uncertainty: 3
  max_dependencies: 3
  testing_scope: 1
---

# Bolt: 001-native-host

## Overview

Time-boxed spike: verify headless Claude Code tool restriction, structured JSON output, model selection and error detection; record the tested (minimum) version.

## Objective

Implement and test the stories below so that every acceptance criterion passes.

## Stories Included

- **001-claude-code-headless-spike**: Claude Code headless spike (Must)

## Bolt Type

**Type**: simple-construction-bolt
**Definition**: `.specsmd/aidlc/templates/construction/bolt-types/simple-construction-bolt.md`

## Stages

- [x] **1. plan**: Complete → implementation-plan.md
- [x] **2. implement**: Complete → source + implementation-walkthrough.md
- [x] **3. test**: Complete → tests + test-walkthrough.md

## Dependencies

### Requires
- None (first bolt)

### Enables
- 002-cv-tailoring-core

## Success Criteria

- [ ] All stories implemented
- [ ] All acceptance criteria met
- [ ] Tests passing
- [ ] Code reviewed

## Notes

Spike output (`spike-report.md`) informs schemas (bolt 002) and the provider (bolt 004).
