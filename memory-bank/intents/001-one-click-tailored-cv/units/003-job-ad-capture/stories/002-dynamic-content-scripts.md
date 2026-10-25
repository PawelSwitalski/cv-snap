---
id: 002-dynamic-content-scripts
unit: 003-job-ad-capture
intent: 001-one-click-tailored-cv
status: draft
priority: must
created: 2026-10-25T12:00:00Z
assigned_bolt: 007-job-ad-capture
implemented: false
---

# Story: 002-dynamic-content-scripts

## User Story

**As a** job seeker
**I want** cv-snap's page reader to run only on sites I allowed and to start working right after I allow a site
**So that** access is limited and adding a site needs no reload of the side panel

## Acceptance Criteria

- [ ] **Given** a newly granted origin, **When** granted, **Then** the content script is registered for it and injected into open matching tabs
- [ ] **Given** a removed origin, **When** removed, **Then** the content script is unregistered
- [ ] **Given** the browser restarts, **When** the extension starts, **Then** registrations match the currently granted origins

## Technical Notes

- `chrome.scripting.registerContentScripts` with `persistAcrossSessions`; reconcile on startup

## Dependencies

### Requires
- 001-allowed-sites-management

### Enables
- 003-job-ad-detection

## Edge Cases

| Scenario | Expected Behavior |
|---|---|
| Tab opened before grant | Script injected via `executeScript` after grant |

## Out of Scope

- Detection logic (003)
