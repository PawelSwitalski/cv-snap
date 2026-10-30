---
id: 004-toolbar-icon-opens-panel
unit: 001-store-ready-extension
intent: 002-release-readiness
status: complete
priority: must
created: '2026-10-30T19:40:00Z'
assigned_bolt: 018-store-ready-extension
implemented: true
---

# Story: 004-toolbar-icon-opens-panel

## User Story

**As a** user on a job ad that cv-snap may not read yet
**I want** a click on the cv-snap icon to open the panel and show "Add this site" at once
**So that** I can add the site without guessing how the icon and the panel work together

## Acceptance Criteria

- [ ] **Given** the side panel is open and shows "click the cv-snap icon on this page", **When**
  the user clicks the icon on that page, **Then** the panel stays open and shows "Add this site"
  without another step
- [ ] **Given** the side panel is closed, **When** the user clicks the icon on a job ad, **Then**
  the panel opens and shows "Add this site" (or Generate on an allowed site)
- [ ] **Given** the icon is clicked, **When** the panel is already open, **Then** it is never
  closed by that click

## Technical Notes

- Found in the Operations dev check of release 0.1.0 (2026-10-30, user): with
  `openPanelOnActionClick`, current Chrome toggles the panel and nothing tells an open panel that
  the click granted `activeTab`, so the panel kept the old hint
- The background handles `action.onClicked` itself: it opens the panel and tells the panel to read
  the page again

## Edge Cases

| Scenario | Expected Behavior |
|---|---|
| The panel isn't listening yet (just opening) | It reads the page when it starts, so nothing is lost |
| The extension was updated from a build with `openPanelOnActionClick: true` | The behaviour is reset to `false` on start |
| Icon clicked on a `chrome://` page | Panel opens and shows "https:// pages only" |
