---
id: 015-host-package
unit: 002-host-package
intent: 002-release-readiness
type: simple-construction-bolt
status: complete
stories:
  - 004-macos-linux-registration
  - 005-doctor-command
  - 006-release-pack-and-version-check
created: '2026-10-29T16:09:23Z'
started: '2026-10-29T18:20:00Z'
completed: '2026-10-29T18:43:50Z'
current_stage: null
stages_completed:
  - name: plan
    completed: '2026-10-29T18:25:00Z'
    artifact: implementation-plan.md
  - name: implement
    completed: '2026-10-29T19:20:00Z'
    artifact: implementation-walkthrough.md
requires_bolts:
  - 014-host-package
enables_bolts:
  - 016-ci-and-release-docs
requires_units: []
blocks: true
complexity:
  avg_complexity: 2
  avg_uncertainty: 2
  max_dependencies: 2
  testing_scope: 3
---

# Bolt: 015-host-package

## Overview

macOS and Linux registration, `doctor`, and the release packing step with the version check.

## Objective

Implement and test the stories below so that every acceptance criterion passes.

## Stories Included

- **004-macos-linux-registration**: Registration on macOS and Linux (Must)
- **005-doctor-command**: doctor command (Should)
- **006-release-pack-and-version-check**: Release packing and version check (Should)

## Bolt Type

**Type**: simple-construction-bolt
**Definition**: `.specsmd/aidlc/templates/construction/bolt-types/simple-construction-bolt.md`

## Stages

- [x] **1. plan**: Complete → implementation-plan.md
- [x] **2. implement**: Complete → source + implementation-walkthrough.md
- [x] **3. test**: Complete → tests + test-walkthrough.md

## Dependencies

### Requires
- 014-host-package

### Enables
- 016-ci-and-release-docs

## Success Criteria

- [x] All stories implemented
- [x] All acceptance criteria met
- [x] Tests passing
- [x] Code reviewed
