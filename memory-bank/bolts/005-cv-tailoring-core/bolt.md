---
id: 005-cv-tailoring-core
unit: 001-cv-tailoring-core
intent: 001-one-click-tailored-cv
type: ddd-construction-bolt
status: complete
stories:
  - 003-cv-profile-extraction
  - 004-job-requirements-parsing-and-cache
  - 005-tailoring-plan-generation
created: '2026-10-25T12:00:00Z'
started: '2026-10-25T20:13:51Z'
completed: '2026-10-27T19:03:07Z'
current_stage: null
stages_completed:
  - name: model
    completed: '2026-10-25T20:25:48Z'
    artifact: ddd-01-domain-model.md
  - name: design
    completed: '2026-10-27T17:39:31Z'
    artifact: ddd-02-technical-design.md
  - name: adr
    completed: '2026-10-27T17:39:31Z'
    artifact: none (ADR stage skipped by user; contract changes documented in ddd-02)
  - name: implement
    completed: '2026-10-27T18:50:08Z'
    artifact: source code (merged into main working tree)
  - name: test
    completed: '2026-10-27T19:03:07Z'
    artifact: ddd-03-test-report.md
requires_bolts:
  - 004-native-host
enables_bolts:
  - 006-cv-tailoring-core
  - 010-tailored-cv-ui
requires_units:
  - 002-native-host
blocks: true
complexity:
  avg_complexity: 3
  avg_uncertainty: 2
  max_dependencies: 2
  testing_scope: 2
---

# Bolt: 005-cv-tailoring-core

## Overview

Model and implement the three AI steps: profile extraction, requirements parsing (with cache), and cited tailoring plans in the ad's language.

## Objective

Implement and test the stories below so that every acceptance criterion passes.

## Stories Included

- **003-cv-profile-extraction**: CV profile extraction (Must)
- **004-job-requirements-parsing-and-cache**: Job requirements parsing and cache (Must)
- **005-tailoring-plan-generation**: Tailoring plan generation (Must)

## Bolt Type

**Type**: ddd-construction-bolt
**Definition**: `.specsmd/aidlc/templates/construction/bolt-types/ddd-construction-bolt.md`

## Stages

- [x] **1. model**: Complete → ddd-01-domain-model.md
- [x] **2. design**: Complete → ddd-02-technical-design.md
- [x] **3. adr**: Skipped (no ADRs; decisions recorded in ddd-02)
- [x] **4. implement**: Complete → source code
- [x] **5. test**: Complete → ddd-03-test-report.md

## Dependencies

### Requires
- 004-native-host

### Enables
- 006-cv-tailoring-core
- 010-tailored-cv-ui

## Success Criteria

- [ ] All stories implemented
- [ ] All acceptance criteria met
- [ ] Tests passing
- [ ] Code reviewed

## Notes

None.
