---
id: 018-store-ready-extension
unit: 001-store-ready-extension
intent: 002-release-readiness
type: simple-construction-bolt
status: complete
stories:
  - 004-toolbar-icon-opens-panel
created: '2026-10-30T19:40:00Z'
started: '2026-10-30T19:40:00Z'
completed: '2026-10-30T21:32:22Z'
current_stage: null
stages_completed:
  - name: plan
    completed: '2026-10-30T20:05:00Z'
    artifact: implementation-plan.md
  - name: implement
    completed: '2026-10-30T20:35:00Z'
    artifact: implementation-walkthrough.md
requires_bolts:
  - 017-host-package
enables_bolts: []
requires_units: []
blocks: true
complexity:
  avg_complexity: 1
  avg_uncertainty: 1
  max_dependencies: 1
  testing_scope: 2
---

# Bolt: 018-store-ready-extension

## Overview

Fix bolt from Operations: in the dev check of release 0.1.0, clicking the cv-snap icon only closed
and reopened the side panel, and "Add this site" never appeared.

## Objective

Implement and test the story below so that every acceptance criterion passes, then re-pack
release 0.1.0.

## Stories Included

- **004-toolbar-icon-opens-panel**: the icon opens the panel and shows "Add this site" at once (Must)

## Bolt Type

**Type**: simple-construction-bolt
**Definition**: `.specsmd/aidlc/templates/construction/bolt-types/simple-construction-bolt.md`

## Stages

- [x] **1. plan**: Complete → implementation-plan.md
- [x] **2. implement**: Complete → source + implementation-walkthrough.md
- [x] **3. test**: Complete → tests + test-walkthrough.md

## Dependencies

### Requires
- 017-host-package

### Enables
- Operations (release 0.1.0)

## Success Criteria

- [x] All stories implemented
- [x] All acceptance criteria met
- [x] Tests passing (and CI green on Windows, macOS, Ubuntu)
- [x] Code reviewed
