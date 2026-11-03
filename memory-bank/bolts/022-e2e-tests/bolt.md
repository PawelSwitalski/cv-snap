---
id: 022-e2e-tests
unit: 004-e2e-tests
intent: 004-application-history
type: simple-construction-bolt
status: planned
stories:
  - 001-fake-ai-provider
  - 002-e2e-harness
  - 003-one-click-e2e
  - 004-e2e-ci-job
created: '2026-11-03T15:40:00Z'
started: null
completed: null
current_stage: null
stages_completed: []
requires_bolts: []
enables_bolts:
  - 027-e2e-tests
requires_units: []
blocks: false
complexity:
  avg_complexity: 2
  avg_uncertainty: 3
  max_dependencies: 3
  testing_scope: 3
---

# Bolt: 022-e2e-tests

## Overview

Spike first: get Chromium under Playwright talking to the real host with the fake provider. Then the one-click test and the CI job. Gives a safety net before the history work changes the Generate view.

## Objective

Implement and test the stories below so that every acceptance criterion passes.

## Stories Included

- **001-fake-ai-provider**: Fake AI provider in the host (Must)
- **002-e2e-harness**: Playwright harness: extension + real host (Must)
- **003-one-click-e2e**: E2E: one-click flow (Must)
- **004-e2e-ci-job**: E2E job in CI (Must)

## Bolt Type

**Type**: simple-construction-bolt
**Definition**: `.specsmd/aidlc/templates/construction/bolt-types/simple-construction-bolt.md`

## Stages

- [ ] **1. plan**: Pending → implementation-plan.md
- [ ] **2. implement**: Pending → source + implementation-walkthrough.md
- [ ] **3. test**: Pending → tests + test-walkthrough.md

## Dependencies

### Requires
- None

### Enables
- 027-e2e-tests

## Success Criteria

- [ ] All stories implemented
- [ ] All acceptance criteria met
- [ ] `pnpm test` green and `pnpm test:e2e` green
- [ ] Code reviewed (user, stage checkpoints)
