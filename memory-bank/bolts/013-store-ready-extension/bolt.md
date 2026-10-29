---
id: 013-store-ready-extension
unit: 001-store-ready-extension
intent: 002-release-readiness
type: simple-construction-bolt
status: planned
stories:
  - 001-release-build-without-key
  - 002-store-extension-id
  - 003-extension-icons
created: 2026-10-29T16:09:23Z
started: null
completed: null
current_stage: null
stages_completed: []

requires_bolts: []
enables_bolts: [014-host-package]
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

- [ ] **1. plan**: Pending → implementation-plan.md
- [ ] **2. implement**: Pending → source + implementation-walkthrough.md
- [ ] **3. test**: Pending → tests + test-walkthrough.md

## Dependencies

### Requires
- None

### Enables
- 014-host-package

## Success Criteria

- [ ] All stories implemented
- [ ] All acceptance criteria met
- [ ] Tests passing
- [ ] Code reviewed
