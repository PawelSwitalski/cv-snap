---
id: 008-job-ad-capture
unit: 003-job-ad-capture
intent: 001-one-click-tailored-cv
type: simple-construction-bolt
status: complete
stories:
  - 003-job-ad-detection
  - 004-job-ad-text-extraction
  - 005-manual-selection-fallback
created: '2026-10-25T12:00:00Z'
started: '2026-10-28T06:44:05Z'
completed: '2026-10-28T19:08:24Z'
current_stage: null
stages_completed:
  - name: plan
    completed: '2026-10-28T07:05:27Z'
    artifact: implementation-plan.md
  - name: implement
    completed: '2026-10-28T11:52:24Z'
    artifact: implementation-walkthrough.md
  - name: test
    completed: '2026-10-28T19:08:23Z'
    artifact: test-walkthrough.md
requires_bolts:
  - 007-job-ad-capture
enables_bolts:
  - 011-tailored-cv-ui
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

- [x] **1. plan**: Complete → implementation-plan.md
- [x] **2. implement**: Complete → source + implementation-walkthrough.md
- [x] **3. test**: Complete → tests + test-walkthrough.md

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
