---
id: 014-host-package
unit: 002-host-package
intent: 002-release-readiness
type: simple-construction-bolt
status: planned
stories:
  - 001-bundled-host-package
  - 002-cli-command-routing
  - 003-stable-install-location
created: 2026-10-29T16:09:23Z
started: null
completed: null
current_stage: null
stages_completed: []

requires_bolts: [013-store-ready-extension]
enables_bolts: [015-host-package]
requires_units: [001-store-ready-extension]
blocks: true

complexity:
  avg_complexity: 2
  avg_uncertainty: 2
  max_dependencies: 2
  testing_scope: 2
---

# Bolt: 014-host-package

## Overview

The publishable `cv-snap-host` package: `shared` bundled, user commands routed apart from the host, install to a stable directory.

## Objective

Implement and test the stories below so that every acceptance criterion passes.

## Stories Included

- **001-bundled-host-package**: Bundled host package (Must)
- **002-cli-command-routing**: One command for users and Chrome (Must)
- **003-stable-install-location**: Install to a stable location (Must)

## Bolt Type

**Type**: simple-construction-bolt
**Definition**: `.specsmd/aidlc/templates/construction/bolt-types/simple-construction-bolt.md`

## Stages

- [ ] **1. plan**: Pending → implementation-plan.md
- [ ] **2. implement**: Pending → source + implementation-walkthrough.md
- [ ] **3. test**: Pending → tests + test-walkthrough.md

## Dependencies

### Requires
- 013-store-ready-extension

### Enables
- 015-host-package

## Success Criteria

- [ ] All stories implemented
- [ ] All acceptance criteria met
- [ ] Tests passing
- [ ] Code reviewed
