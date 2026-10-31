---
id: 019-store-ready-extension
unit: 001-store-ready-extension
intent: 002-release-readiness
type: simple-construction-bolt
status: complete
stories:
  - 005-pdf-in-store-build
created: '2026-10-31T09:00:00Z'
started: '2026-10-31T09:00:00Z'
completed: '2026-10-31T08:47:55Z'
current_stage: null
stages_completed:
  - name: plan
    completed: '2026-10-31T09:05:00Z'
    artifact: implementation-plan.md
  - name: implement
    completed: '2026-10-31T09:30:00Z'
    artifact: implementation-walkthrough.md
requires_bolts:
  - 018-store-ready-extension
enables_bolts: []
requires_units: []
blocks: true
complexity:
  avg_complexity: 1
  avg_uncertainty: 1
  max_dependencies: 1
  testing_scope: 2
---

# Bolt: 019-store-ready-extension

## Overview

Fix bolt from Operations: in the dev check of release 0.1.0, Download PDF failed ("The PDF
couldn't be prepared") because Chrome's default extension policy blocks WebAssembly, which the PDF
library uses for layout.

## Objective

Implement and test the story below so that every acceptance criterion passes, then re-pack
release 0.1.0.

## Stories Included

- **005-pdf-in-store-build**: Download PDF works outside `pnpm dev` (Must)

## Bolt Type

**Type**: simple-construction-bolt
**Definition**: `.specsmd/aidlc/templates/construction/bolt-types/simple-construction-bolt.md`

## Stages

- [x] **1. plan**: Complete → implementation-plan.md (approved with the fix proposal, user)
- [x] **2. implement**: Complete → source + implementation-walkthrough.md
- [x] **3. test**: Complete → tests + test-walkthrough.md

## Dependencies

### Requires
- 018-store-ready-extension

### Enables
- Operations (release 0.1.0)

## Success Criteria

- [x] All stories implemented
- [x] All acceptance criteria met
- [x] Tests passing (and CI green on Windows, macOS, Ubuntu)
- [x] Code reviewed
