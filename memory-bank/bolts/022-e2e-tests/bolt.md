---
id: 022-e2e-tests
unit: 004-e2e-tests
intent: 004-application-history
type: simple-construction-bolt
status: complete
stories:
  - 001-fake-ai-provider
  - 002-e2e-harness
  - 003-one-click-e2e
  - 004-e2e-ci-job
created: '2026-11-03T15:28:00Z'
started: '2026-11-03T15:30:24Z'
completed: '2026-11-03T15:55:24Z'
current_stage: null
stages_completed:
  - name: plan
    completed: '2026-11-03T15:33:35Z'
    artifact: implementation-plan.md
  - name: implement
    completed: '2026-11-03T15:50:31Z'
    artifact: implementation-walkthrough.md
  - name: test
    completed: '2026-11-03T15:55:24Z'
    artifact: test-walkthrough.md
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

- [x] **1. plan**: Complete → implementation-plan.md (approved, user)
- [x] **2. implement**: Complete → source + implementation-walkthrough.md (approved, user)
- [x] **3. test**: Complete → tests + test-walkthrough.md (approved, user)

## Dependencies

### Requires
- None

### Enables
- 027-e2e-tests

## Success Criteria

- [x] All stories implemented
- [x] All acceptance criteria met
- [x] `pnpm test` green and `pnpm test:e2e` green (Windows; CI Ubuntu run pending the push)
- [x] Code reviewed (user, stage checkpoints)
