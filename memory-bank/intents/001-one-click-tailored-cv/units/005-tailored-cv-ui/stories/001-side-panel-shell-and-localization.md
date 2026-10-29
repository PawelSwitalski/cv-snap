---
id: 001-side-panel-shell-and-localization
unit: 005-tailored-cv-ui
intent: 001-one-click-tailored-cv
status: complete
priority: must
created: '2026-10-25T12:00:00Z'
assigned_bolt: 010-tailored-cv-ui
implemented: true
---

# Story: 001-side-panel-shell-and-localization

## User Story

**As a** job seeker
**I want** a side panel that opens from the toolbar icon, follows my theme, and speaks Polish or English
**So that** the app is comfortable to use next to job ads

## Acceptance Criteria

- [ ] **Given** the toolbar icon, **When** I click it, **Then** the side panel opens and is interactive in ≤ 500 ms
- [ ] **Given** the browser UI language PL or EN, **When** the panel opens, **Then** it uses that language; other browser languages fall back to EN
- [ ] **Given** a UI-language override in settings, **When** changed, **Then** the panel switches language without reinstalling
- [ ] **Given** system dark mode, **When** the panel opens, **Then** it uses the dark theme
- [ ] **Given** the codebase, **When** lint runs, **Then** no hard-coded user-facing strings are found

## Technical Notes

- `_locales/en`, `_locales/pl`; thin i18n helper supporting the in-app override (chrome.i18n can't switch at runtime)
- Tailwind + shadcn/ui setup; Zustand store per feature; React error boundary

## Dependencies

### Requires
- 001-cv-tailoring-core/001-monorepo-scaffold

### Enables
- 002-onboarding-and-privacy-notice
- 008-settings-panel

## Edge Cases

| Scenario | Expected Behavior |
|---|---|
| Side panel width 320 px | Single-column layout with no horizontal scroll |

## Out of Scope

- Feature screens
