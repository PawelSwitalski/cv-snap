---
id: 002-e2e-harness
unit: 004-e2e-tests
intent: 004-application-history
status: draft
priority: must
created: '2026-11-03T15:40:00Z'
assigned_bolt: 022-e2e-tests
implemented: false
---

# Story: 002-e2e-harness

## User Story

**As a** developer
**I want** a Playwright setup that loads the dev extension and talks to the real host
**So that** E2E tests exercise the actual flow

## Acceptance Criteria

- [ ] **Given** `pnpm test:e2e`, **When** run, **Then** it builds the extension (dev ID) and host, launches Chromium with the unpacked extension (`launchPersistentContext`, temp user-data dir) and opens the side panel page
- [ ] **Given** the test run, **When** it starts, **Then** the native host manifest for the dev ID is registered for the test browser only (Linux: user-level `NativeMessagingHosts` for the test profile; Windows: HKCU key) pointing to a launcher with `CV_SNAP_FAKE_PROVIDER`; **When** it ends, **Then** it is removed and any previous registration is restored
- [ ] **Given** a seeded profile fixture, **When** a test starts, **Then** `storage.local` has a confirmed profile and the privacy notice acknowledged
- [ ] **Given** fixture job-ad pages, **When** served by a local static server on an allowed origin, **Then** detection and capture work
- [ ] **Given** the native-host connection can't be made to work under Playwright, **When** decided in the spike, **Then** fall back to a fake native port in a test build of the extension (documented in the plan; host stays covered by its own tests)

## Technical Notes

- New top-level `e2e/` package (Playwright test, fixtures, global setup/teardown)
- Side panel: open `chrome-extension://<id>/sidepanel.html` directly in a tab; the action-click path stays covered by unit tests
- Allowed sites: grant the fixture origin via the existing allowed-sites flow or a seeded permission

## Edge Cases

| Scenario | Expected Behavior |
|---|---|
| A real cv-snap install exists on the dev machine | Harness backs it up and restores it; never deletes it |
