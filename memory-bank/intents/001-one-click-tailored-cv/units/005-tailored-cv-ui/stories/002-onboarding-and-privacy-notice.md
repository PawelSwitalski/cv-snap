---
id: 002-onboarding-and-privacy-notice
unit: 005-tailored-cv-ui
intent: 001-one-click-tailored-cv
status: complete
priority: must
created: '2026-10-25T12:00:00Z'
assigned_bolt: 010-tailored-cv-ui
implemented: true
---

# Story: 002-onboarding-and-privacy-notice

## User Story

**As a** first-time user
**I want** a guided first run: privacy notice, setup check, then CV upload
**So that** I understand where my data goes and my setup works before I start

## Acceptance Criteria

- [ ] **Given** first open, **When** the panel loads, **Then** the privacy notice is shown and upload is blocked until I acknowledge it
- [ ] **Given** I acknowledged, **When** I reopen the panel, **Then** the notice is not shown again unless its version changed
- [ ] **Given** the setup check, **When** a condition fails, **Then** the specific fix hint and a 'Check again' button are shown and onboarding does not advance
- [ ] **Given** an outdated Claude Code, **When** checked, **Then** a non-blocking update warning is shown
- [ ] **Given** settings, **When** I open 'Privacy', **Then** the notice is shown again

## Technical Notes

- Notice text states: data sent to Anthropic via your Claude Code during generation; no cv-snap server; stored locally in this Chrome profile

## Dependencies

### Requires
- 001-side-panel-shell-and-localization
- 002-native-host/004-health-check

### Enables
- 003-cv-upload-and-profile-creation

## Edge Cases

| Scenario | Expected Behavior |
|---|---|
| Host installed while panel is open | 'Check again' succeeds without reload |

## Out of Scope

- Upload itself (003)
