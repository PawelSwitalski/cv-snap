---
id: 006-history-only-e2e
unit: 002-history-only-mode
intent: 005-own-cv-in-history
status: draft
priority: must
created: '2026-11-04T16:40:00Z'
assigned_bolt: 030-history-only-backup
implemented: false
---

# Story: 006-history-only-e2e

## User Story

**As a** job seeker
**I want** a browser test of the no-helper path
**So that** it doesn't break unnoticed

## Acceptance Criteria

- [ ] **Given** a test browser with no host registered, **When** the test runs, **Then** it acknowledges the notice, chooses Use without the helper, uploads a PDF, saves it for the fixture ad and finds a "Your CV" entry in History
- [ ] **Given** the same run, **When** it ends, **Then** no native messaging connection was opened after the setup check
- [ ] **Given** CI, **When** it runs `pnpm test:e2e`, **Then** this test runs with the others

## Technical Notes

- New harness option: launch without registering the host

## Edge Cases

None beyond the criteria.
