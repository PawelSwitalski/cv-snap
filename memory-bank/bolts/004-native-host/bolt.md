---
id: 004-native-host
unit: 002-native-host
intent: 001-one-click-tailored-cv
type: simple-construction-bolt
status: complete
stories:
  - 005-claude-code-provider
  - 006-pdf-text-extraction
created: '2026-10-25T12:00:00Z'
started: '2026-10-25T19:39:45Z'
completed: '2026-10-25T20:10:12Z'
current_stage: null
stages_completed:
  - name: plan
    completed: '2026-10-25T19:44:14Z'
    artifact: implementation-plan.md
  - name: implement
    completed: '2026-10-25T19:56:46Z'
    artifact: implementation-walkthrough.md
  - name: test
    completed: '2026-10-25T20:10:12Z'
    artifact: test-walkthrough.md
requires_bolts:
  - 003-native-host
enables_bolts:
  - 005-cv-tailoring-core
  - 010-tailored-cv-ui
requires_units: []
blocks: true
complexity:
  avg_complexity: 2
  avg_uncertainty: 2
  max_dependencies: 3
  testing_scope: 2
---

# Bolt: 004-native-host

## Overview

Run Claude Code safely (tools off, timeout, cancel, model) and extract text from CV PDFs.

## Objective

Implement and test the stories below so that every acceptance criterion passes.

## Stories Included

- **005-claude-code-provider**: Claude Code provider (Must)
- **006-pdf-text-extraction**: PDF text extraction (Must)

## Bolt Type

**Type**: simple-construction-bolt
**Definition**: `.specsmd/aidlc/templates/construction/bolt-types/simple-construction-bolt.md`

## Stages

- [x] **1. plan**: Complete → implementation-plan.md
- [x] **2. implement**: Complete → source + implementation-walkthrough.md
- [x] **3. test**: Complete → tests + test-walkthrough.md

## Dependencies

### Requires
- 003-native-host

### Enables
- 005-cv-tailoring-core
- 010-tailored-cv-ui

## Success Criteria

- [ ] All stories implemented
- [ ] All acceptance criteria met
- [ ] Tests passing
- [ ] Code reviewed

## Notes

None.
