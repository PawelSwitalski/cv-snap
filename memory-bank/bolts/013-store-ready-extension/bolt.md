---
id: 013-store-ready-extension
unit: 001-store-ready-extension
intent: 002-release-readiness
type: simple-construction-bolt
status: complete
stories:
  - 001-release-build-without-key
  - 002-store-extension-id
  - 003-extension-icons
created: '2026-10-29T16:09:23Z'
started: '2026-10-29T16:12:48Z'
completed: '2026-10-29T17:29:08Z'
current_stage: null
stages_completed:
  - name: plan
    completed: '2026-10-29T16:14:30Z'
    artifact: implementation-plan.md
  - name: implement
    completed: '2026-10-29T16:18:25Z'
    artifact: implementation-walkthrough.md
requires_bolts: []
enables_bolts:
  - 014-host-package
requires_units: []
blocks: true
complexity:
  avg_complexity: 1
  avg_uncertainty: 1
  max_dependencies: 1
  testing_scope: 2
---

# Bolt: 013-store-ready-extension

## Overview

Release build without the dev key, the store ID trusted next to the dev ID, and icons.

## Objective

Implement and test the stories below so that every acceptance criterion passes.

## Stories Included

- **001-release-build-without-key**: Release build without the dev key (Must)
- **002-store-extension-id**: Store extension ID trusted by the host (Must)
- **003-extension-icons**: Extension icons (Must)

## Bolt Type

**Type**: simple-construction-bolt
**Definition**: `.specsmd/aidlc/templates/construction/bolt-types/simple-construction-bolt.md`

## Stages

- [x] **1. plan**: Complete → implementation-plan.md
- [x] **2. implement**: Complete → source + implementation-walkthrough.md
- [x] **3. test**: Complete → tests + test-walkthrough.md

## Dependencies

### Requires
- None

### Enables
- 014-host-package

## Success Criteria

- [x] All stories implemented
- [x] All acceptance criteria met
- [x] Tests passing
- [x] Code reviewed
