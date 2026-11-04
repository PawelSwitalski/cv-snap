---
id: 030-history-only-backup
unit: 002-history-only-mode
intent: 005-own-cv-in-history
type: simple-construction-bolt
status: planned
stories:
  - 004-backup-without-profile
  - 005-privacy-text
  - 006-history-only-e2e
created: '2026-11-04T16:40:00Z'
started: null
completed: null
current_stage: null
stages_completed: []
requires_bolts:
  - 029-history-only-mode
enables_bolts: []
requires_units:
  - 001-own-cv-save
blocks: false
complexity:
  avg_complexity: 2
  avg_uncertainty: 2
  max_dependencies: 1
  testing_scope: 2
---

# Bolt: 030-history-only-backup

## Overview

Backups without a profile, the privacy text, and the E2E test with no host.

## Objective

Implement and test the stories below so that every acceptance criterion passes.

## Stories Included

- **004-backup-without-profile**: Backups without a profile (Must)
- **005-privacy-text**: Privacy text for own CVs (Must)
- **006-history-only-e2e**: E2E: history-only mode (Must)

## Bolt Type

**Type**: simple-construction-bolt
**Definition**: `.specsmd/aidlc/templates/construction/bolt-types/simple-construction-bolt.md`

## Stages

- [ ] **1. plan**: Pending → implementation-plan.md
- [ ] **2. implement**: Pending → source + implementation-walkthrough.md
- [ ] **3. test**: Pending → tests + test-walkthrough.md

## Dependencies

### Requires
- 029-history-only-mode

### Enables
- Operations (next release)

## Success Criteria

- [ ] All stories implemented
- [ ] All acceptance criteria met
- [ ] `pnpm test` green and `pnpm test:e2e` green
- [ ] Code reviewed (user, stage checkpoints)
