---
id: 016-ci-and-release-docs
unit: 003-ci-and-release-docs
intent: 002-release-readiness
type: simple-construction-bolt
status: planned
stories:
  - 001-ci-three-os
  - 002-mit-license
  - 003-end-user-readme
  - 004-privacy-policy-page
  - 005-store-listing-texts
created: 2026-10-29T16:09:23Z
started: null
completed: null
current_stage: null
stages_completed: []

requires_bolts: [015-host-package]
enables_bolts: []
requires_units: [002-host-package]
blocks: false

complexity:
  avg_complexity: 1
  avg_uncertainty: 1
  max_dependencies: 2
  testing_scope: 2
---

# Bolt: 016-ci-and-release-docs

## Overview

CI on Windows, macOS and Linux with install tests, the MIT license, the end-user README, the privacy policy page and the store listing texts.

## Objective

Implement and test the stories below so that every acceptance criterion passes.

## Stories Included

- **001-ci-three-os**: CI on three operating systems (Must)
- **002-mit-license**: MIT license (Must)
- **003-end-user-readme**: End-user README (Must)
- **004-privacy-policy-page**: Privacy policy page (Must)
- **005-store-listing-texts**: Chrome Web Store listing texts (Must)

## Bolt Type

**Type**: simple-construction-bolt
**Definition**: `.specsmd/aidlc/templates/construction/bolt-types/simple-construction-bolt.md`

## Stages

- [ ] **1. plan**: Pending → implementation-plan.md
- [ ] **2. implement**: Pending → source + implementation-walkthrough.md
- [ ] **3. test**: Pending → tests + test-walkthrough.md

## Dependencies

### Requires
- 015-host-package

### Enables
- None

## Success Criteria

- [ ] All stories implemented
- [ ] All acceptance criteria met
- [ ] Tests passing
- [ ] Code reviewed
