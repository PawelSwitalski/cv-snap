---
id: 008-settings-panel
unit: 005-tailored-cv-ui
intent: 001-one-click-tailored-cv
status: draft
priority: must
created: 2026-10-25T12:00:00Z
assigned_bolt: 012-tailored-cv-ui
implemented: false
---

# Story: 008-settings-panel

## User Story

**As a** job seeker
**I want** one place to choose the Claude model, UI language, allowed sites, RODO clause, and to view the privacy notice
**So that** I can tune cv-snap to my needs

## Acceptance Criteria

- [ ] **Given** settings, **When** I open Model, **Then** I can choose Sonnet 5.5 (default), Opus 5.5 or Haiku 5.5, each with a one-line trade-off note, and the choice is used for every Claude call
- [ ] **Given** settings, **When** I open Allowed sites, **Then** I can add presets, add the current site, and remove sites (backed by 003/001)
- [ ] **Given** settings, **When** I edit the RODO clause (PL and EN) and its mode (Polish ads only / always / never), **Then** the renderer uses it
- [ ] **Given** settings, **When** I change the UI language, **Then** the panel switches immediately

## Technical Notes

- Model IDs: `claude-sonnet-5-5`, `claude-opus-5-5`, `claude-haiku-5-5`

## Dependencies

### Requires
- 001-side-panel-shell-and-localization
- 003-job-ad-capture/001-allowed-sites-management
- 004-cv-pdf-renderer/004-gdpr-consent-clause

### Enables
- None within this unit

## Edge Cases

| Scenario | Expected Behavior |
|---|---|
| Model unavailable on plan | Error from generation points back to this setting |

## Out of Scope

- Strict mode toggle (future intent)
