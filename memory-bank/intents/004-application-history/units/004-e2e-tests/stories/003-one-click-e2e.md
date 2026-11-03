---
id: 003-one-click-e2e
unit: 004-e2e-tests
intent: 004-application-history
status: complete
priority: must
created: '2026-11-03T15:28:00Z'
assigned_bolt: 022-e2e-tests
implemented: true
---

# Story: 003-one-click-e2e

## User Story

**As a** developer
**I want** an end-to-end test of Generate → preview → Download PDF
**So that** regressions in the main flow are caught before a release

## Acceptance Criteria

- [ ] **Given** the fixture job-ad page and a seeded profile, **When** the test clicks Generate, **Then** progress steps appear and the preview shows the fixture plan's content
- [ ] **Given** the preview, **When** the test clicks Download PDF, **Then** a file is downloaded whose first bytes are `%PDF` and whose name follows the file-name rules

## Technical Notes

- None
