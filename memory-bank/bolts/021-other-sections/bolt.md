---
id: 021-other-sections
unit: 002-other-sections
intent: 003-complete-cv-content
type: simple-construction-bolt
status: planned
stories:
  - 001-plan-selects-other-sections
  - 002-other-sections-in-cv
created: '2026-11-02T18:45:00Z'
started: null
completed: null
current_stage: null
stages_completed: []
requires_bolts:
  - 020-complete-cv-model
enables_bolts: []
requires_units:
  - 001-complete-cv-model
blocks: false
complexity:
  avg_complexity: 2
  avg_uncertainty: 2
  max_dependencies: 2
  testing_scope: 2
---

# Bolt: 021-other-sections

## Overview

Profile "other sections" (courses, volunteering, …) are never printed today. The plan gains an
optional list of selected other sections; the host prompt and validator support it, the extension
prints them and drops them first to fit two pages. Touches `shared/` (host) and the extension.

## Objective

Implement and test the stories below so that every acceptance criterion passes, keeping mixed
extension / host versions working.

## Stories Included

- **001-plan-selects-other-sections**: Plan selects other sections, validator checks them (Must)
- **002-other-sections-in-cv**: Selected other sections printed, dropped first (Should)

## Bolt Type

**Type**: simple-construction-bolt
**Definition**: `.specsmd/aidlc/templates/construction/bolt-types/simple-construction-bolt.md`

## Stages

- [ ] **1. plan**: Pending → implementation-plan.md
- [ ] **2. implement**: Pending → source + implementation-walkthrough.md
- [ ] **3. test**: Pending → tests + test-walkthrough.md

## Dependencies

### Requires
- 020-complete-cv-model

### Enables
- Operations (release 0.1.1 of the extension and the host)

## Success Criteria

- [ ] All stories implemented
- [ ] All acceptance criteria met
- [ ] `pnpm test` green; `pnpm test:live` green, with a fixture where an other section is relevant
- [ ] Code reviewed
