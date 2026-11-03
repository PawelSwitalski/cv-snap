---
id: 004-e2e-ci-job
unit: 004-e2e-tests
intent: 004-application-history
status: draft
priority: must
created: '2026-11-03T15:40:00Z'
assigned_bolt: 022-e2e-tests
implemented: false
---

# Story: 004-e2e-ci-job

## User Story

**As a** developer
**I want** E2E to run on every push
**So that** a broken flow can't reach a release

## Acceptance Criteria

- [ ] **Given** a push, **When** CI runs, **Then** an Ubuntu job installs Playwright Chromium and runs `pnpm test:e2e` (headless new or under `xvfb`)
- [ ] **Given** a failure, **When** the job ends, **Then** the Playwright trace and HTML report are uploaded as artifacts
- [ ] **Given** the release checklist, **When** releasing 0.2.0, **Then** 10 consecutive green runs without retries are required (recorded in the release log)

## Technical Notes

- `.github/workflows/` (existing CI); cache Playwright browsers
