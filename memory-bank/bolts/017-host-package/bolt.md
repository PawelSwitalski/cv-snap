---
id: 017-host-package
unit: 002-host-package
intent: 002-release-readiness
type: simple-construction-bolt
status: complete
stories:
  - 007-cross-platform-ci-green
created: '2026-10-30T16:05:00Z'
started: '2026-10-30T16:05:00Z'
completed: '2026-10-30T18:44:10Z'
current_stage: null
stages_completed:
  - name: plan
    completed: '2026-10-30T16:15:00Z'
    artifact: implementation-plan.md
  - name: implement
    completed: '2026-10-30T16:45:00Z'
    artifact: implementation-walkthrough.md
requires_bolts:
  - 016-ci-and-release-docs
enables_bolts: []
requires_units: []
blocks: true
complexity:
  avg_complexity: 1
  avg_uncertainty: 1
  max_dependencies: 1
  testing_scope: 2
---

# Bolt: 017-host-package

## Overview

Fix bolt from Operations: the first CI run failed on macOS and Ubuntu. Claude Code discovery on
macOS and Linux, plus tests that assumed Windows.

## Objective

Implement and test the story below so that every acceptance criterion passes and CI is green on all
three OSes.

## Stories Included

- **007-cross-platform-ci-green**: Claude Code found on macOS/Linux; CI green on three OSes (Must)

## Bolt Type

**Type**: simple-construction-bolt
**Definition**: `.specsmd/aidlc/templates/construction/bolt-types/simple-construction-bolt.md`

## Stages

- [x] **1. plan**: Complete → implementation-plan.md
- [x] **2. implement**: Complete → source + implementation-walkthrough.md
- [x] **3. test**: Complete → tests + test-walkthrough.md

## Dependencies

### Requires
- 016-ci-and-release-docs

### Enables
- Operations (release 0.1.0)

## Success Criteria

- [x] All stories implemented
- [x] All acceptance criteria met
- [x] Tests passing (and CI green on Windows, macOS, Ubuntu)
- [x] Code reviewed
