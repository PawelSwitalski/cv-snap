---
id: 003-native-host
unit: 002-native-host
intent: 001-one-click-tailored-cv
type: simple-construction-bolt
status: complete
stories:
  - 002-native-messaging-protocol
  - 003-host-install-scripts
  - 004-health-check
created: '2026-10-25T12:00:00Z'
started: '2026-10-25T18:47:19Z'
completed: '2026-10-25T19:37:59Z'
current_stage: null
stages_completed:
  - name: plan
    completed: '2026-10-25T18:54:25Z'
    artifact: implementation-plan.md
  - name: implement
    completed: '2026-10-25T19:11:21Z'
    artifact: implementation-walkthrough.md
  - name: test
    completed: '2026-10-25T19:37:59Z'
    artifact: test-walkthrough.md
requires_bolts:
  - 002-cv-tailoring-core
enables_bolts:
  - 004-native-host
requires_units:
  - 001-cv-tailoring-core
blocks: true
complexity:
  avg_complexity: 2
  avg_uncertainty: 2
  max_dependencies: 3
  testing_scope: 2
---

# Bolt: 003-native-host

## Overview

A registered, robust native host the extension can connect to, with a full health check.

## Objective

Implement and test the stories below so that every acceptance criterion passes.

## Stories Included

- **002-native-messaging-protocol**: Native messaging protocol (Must)
- **003-host-install-scripts**: Host install scripts (Must)
- **004-health-check**: Health check (Must)

## Bolt Type

**Type**: simple-construction-bolt
**Definition**: `.specsmd/aidlc/templates/construction/bolt-types/simple-construction-bolt.md`

## Stages

- [x] **1. plan**: Complete → implementation-plan.md
- [x] **2. implement**: Complete → source + implementation-walkthrough.md
- [x] **3. test**: Complete → tests + test-walkthrough.md

## Dependencies

### Requires
- 002-cv-tailoring-core

### Enables
- 004-native-host

## Success Criteria

- [ ] All stories implemented
- [ ] All acceptance criteria met
- [ ] Tests passing
- [ ] Code reviewed

## Notes

None.
