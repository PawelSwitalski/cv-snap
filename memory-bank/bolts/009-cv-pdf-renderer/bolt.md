---
id: 009-cv-pdf-renderer
unit: 004-cv-pdf-renderer
intent: 001-one-click-tailored-cv
type: simple-construction-bolt
status: planned
stories:
  - 001-cv-pdf-template
  - 002-two-page-fit
  - 003-pdf-download-and-naming
  - 004-gdpr-consent-clause
created: 2026-10-25T12:00:00Z
started: null
completed: null
current_stage: null
stages_completed: []

requires_bolts: [002-cv-tailoring-core]
enables_bolts: [011-tailored-cv-ui]
requires_units: [001-cv-tailoring-core]
blocks: true

complexity:
  avg_complexity: 2
  avg_uncertainty: 1
  max_dependencies: 1
  testing_scope: 2
---

# Bolt: 009-cv-pdf-renderer

## Overview

A4 CV template with localized headings, photo, two-page fitting, download naming and RODO clause.

## Objective

Implement and test the stories below so that every acceptance criterion passes.

## Stories Included

- **001-cv-pdf-template**: CV PDF template (Must)
- **002-two-page-fit**: Two-page fit (Must)
- **003-pdf-download-and-naming**: PDF download and naming (Must)
- **004-gdpr-consent-clause**: GDPR consent clause (klauzula RODO) (Should)

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
- 011-tailored-cv-ui

## Success Criteria

- [ ] All stories implemented
- [ ] All acceptance criteria met
- [ ] Tests passing
- [ ] Code reviewed

## Notes

Can run in parallel with bolts 003–008.
