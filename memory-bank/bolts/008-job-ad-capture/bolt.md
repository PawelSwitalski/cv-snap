---
id: 008-job-ad-capture
unit: 003-job-ad-capture
intent: 001-one-click-tailored-cv
type: simple-construction-bolt
status: planned
stories:
  - 003-job-ad-detection
  - 004-job-ad-text-extraction
  - 005-manual-selection-fallback
created: 2026-10-25T12:00:00Z
started: null
completed: null
current_stage: null
stages_completed: []

requires_bolts: [007-job-ad-capture]
enables_bolts: [011-tailored-cv-ui]
requires_units: []
blocks: true

complexity:
  avg_complexity: 2
  avg_uncertainty: 2
  max_dependencies: 2
  testing_scope: 2
---

# Bolt: 008-job-ad-capture

## Overview

Detect job ads (JSON-LD, URL patterns, keywords), extract their text, and support manual selection.

## Objective

Implement and test the stories below so that every acceptance criterion passes.

## Stories Included

- **003-job-ad-detection**: Job ad detection (Must)
- **004-job-ad-text-extraction**: Job ad text extraction (Must)
- **005-manual-selection-fallback**: Manual selection fallback (Must)

## Bolt Type

**Type**: simple-construction-bolt
**Definition**: `.specsmd/aidlc/templates/construction/bolt-types/simple-construction-bolt.md`

## Stages

- [ ] **1. plan**: Pending → implementation-plan.md
- [ ] **2. implement**: Pending → source + implementation-walkthrough.md
- [ ] **3. test**: Pending → tests + test-walkthrough.md

## Dependencies

### Requires
- 007-job-ad-capture

### Enables
- 011-tailored-cv-ui

## Success Criteria

- [ ] All stories implemented
- [ ] All acceptance criteria met
- [ ] Tests passing
- [ ] Code reviewed

## Notes

None.
