---
id: 007-job-ad-capture
unit: 003-job-ad-capture
intent: 001-one-click-tailored-cv
type: simple-construction-bolt
status: planned
stories:
  - 001-allowed-sites-management
  - 002-dynamic-content-scripts
created: 2026-10-25T12:00:00Z
started: null
completed: null
current_stage: null
stages_completed: []

requires_bolts: [002-cv-tailoring-core]
enables_bolts: [008-job-ad-capture]
requires_units: [001-cv-tailoring-core]
blocks: true

complexity:
  avg_complexity: 2
  avg_uncertainty: 1
  max_dependencies: 2
  testing_scope: 2
---

# Bolt: 007-job-ad-capture

## Overview

User-managed allowed sites with per-origin permissions and dynamically registered content scripts.

## Objective

Implement and test the stories below so that every acceptance criterion passes.

## Stories Included

- **001-allowed-sites-management**: Allowed sites management (Must)
- **002-dynamic-content-scripts**: Dynamic content scripts (Must)

## Bolt Type

**Type**: simple-construction-bolt
**Definition**: `.specsmd/aidlc/templates/construction/bolt-types/simple-construction-bolt.md`

## Stages

- [ ] **1. plan**: Pending → implementation-plan.md
- [ ] **2. implement**: Pending → source + implementation-walkthrough.md
- [ ] **3. test**: Pending → tests + test-walkthrough.md

## Dependencies

### Requires
- 002-cv-tailoring-core

### Enables
- 008-job-ad-capture

## Success Criteria

- [ ] All stories implemented
- [ ] All acceptance criteria met
- [ ] Tests passing
- [ ] Code reviewed

## Notes

Can run in parallel with bolts 003–006.
