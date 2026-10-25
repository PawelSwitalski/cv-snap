---
id: 010-tailored-cv-ui
unit: 005-tailored-cv-ui
intent: 001-one-click-tailored-cv
type: simple-construction-bolt
status: planned
stories:
  - 001-side-panel-shell-and-localization
  - 002-onboarding-and-privacy-notice
  - 003-cv-upload-and-profile-creation
  - 004-profile-review-editor
created: 2026-10-25T12:00:00Z
started: null
completed: null
current_stage: null
stages_completed: []

requires_bolts: [004-native-host, 005-cv-tailoring-core]
enables_bolts: [011-tailored-cv-ui]
requires_units: [001-cv-tailoring-core, 002-native-host]
blocks: true

complexity:
  avg_complexity: 2
  avg_uncertainty: 1
  max_dependencies: 2
  testing_scope: 2
---

# Bolt: 010-tailored-cv-ui

## Overview

Side panel shell with i18n, onboarding (privacy + health), CV upload and the profile review editor.

## Objective

Implement and test the stories below so that every acceptance criterion passes.

## Stories Included

- **001-side-panel-shell-and-localization**: Side panel shell and localization (Must)
- **002-onboarding-and-privacy-notice**: Onboarding and privacy notice (Must)
- **003-cv-upload-and-profile-creation**: CV upload and profile creation (Must)
- **004-profile-review-editor**: Profile review editor (Must)

## Bolt Type

**Type**: simple-construction-bolt
**Definition**: `.specsmd/aidlc/templates/construction/bolt-types/simple-construction-bolt.md`

## Stages

- [ ] **1. plan**: Pending → implementation-plan.md
- [ ] **2. implement**: Pending → source + implementation-walkthrough.md
- [ ] **3. test**: Pending → tests + test-walkthrough.md

## Dependencies

### Requires
- 004-native-host
- 005-cv-tailoring-core

### Enables
- 011-tailored-cv-ui

## Success Criteria

- [ ] All stories implemented
- [ ] All acceptance criteria met
- [ ] Tests passing
- [ ] Code reviewed

## Notes

None.
