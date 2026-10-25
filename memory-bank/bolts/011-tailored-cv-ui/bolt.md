---
id: 011-tailored-cv-ui
unit: 005-tailored-cv-ui
intent: 001-one-click-tailored-cv
type: simple-construction-bolt
status: planned
stories:
  - 005-generate-flow-with-progress-and-cancel
  - 006-preview-and-editing
  - 007-error-messages-and-recovery
created: 2026-10-25T12:00:00Z
started: null
completed: null
current_stage: null
stages_completed: []

requires_bolts: [010-tailored-cv-ui, 006-cv-tailoring-core, 008-job-ad-capture, 009-cv-pdf-renderer]
enables_bolts: [012-tailored-cv-ui]
requires_units: [001-cv-tailoring-core, 003-job-ad-capture, 004-cv-pdf-renderer]
blocks: true

complexity:
  avg_complexity: 2
  avg_uncertainty: 2
  max_dependencies: 3
  testing_scope: 3
---

# Bolt: 011-tailored-cv-ui

## Overview

The one-click experience: generate, progress/cancel, preview with gaps and unverified markers, editing, download, and error recovery.

## Objective

Implement and test the stories below so that every acceptance criterion passes.

## Stories Included

- **005-generate-flow-with-progress-and-cancel**: Generate flow with progress and cancel (Must)
- **006-preview-and-editing**: Preview and editing (Must)
- **007-error-messages-and-recovery**: Error messages and recovery (Must)

## Bolt Type

**Type**: simple-construction-bolt
**Definition**: `.specsmd/aidlc/templates/construction/bolt-types/simple-construction-bolt.md`

## Stages

- [ ] **1. plan**: Pending → implementation-plan.md
- [ ] **2. implement**: Pending → source + implementation-walkthrough.md
- [ ] **3. test**: Pending → tests + test-walkthrough.md

## Dependencies

### Requires
- 010-tailored-cv-ui
- 006-cv-tailoring-core
- 008-job-ad-capture
- 009-cv-pdf-renderer

### Enables
- 012-tailored-cv-ui

## Success Criteria

- [ ] All stories implemented
- [ ] All acceptance criteria met
- [ ] Tests passing
- [ ] Code reviewed

## Notes

First end-to-end usable version after this bolt.
