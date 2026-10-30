---
stage: implement
bolt: 018-store-ready-extension
created: 2026-10-30T20:30:00Z
---

## Implementation Walkthrough: store-ready-extension (toolbar icon opens the panel)

### Summary

A click on the cv-snap icon is now handled by cv-snap itself instead of Chrome's built-in panel
behaviour. It always opens the side panel and then tells the panel to read the page again, so the
"click the cv-snap icon" hint turns into "Add this site" at once, whether the panel was open or
not.

### Structure Overview

The background worker turns Chrome's built-in "open the panel on click" off and listens to
`action.onClicked` instead. That event fires only when the built-in behaviour is off, and grants
`activeTab` for the tab. The panel's page-state watcher gains one more trigger: a validated
`page-access-changed` message from cv-snap itself.

### Completed Work

- [x] `extension/src/features/generate/action-click.ts`:
  - `handleActionClick(apis, windowId)` opens the panel straight away, with nothing awaited
    first, as Chrome requires for `sidePanel.open`;
  - it then sends `page-access-changed`; "no receiver" is ignored, and a failed open is logged;
  - `PageAccessChangedMessageSchema` and the real APIs (`browserActionClickApis`).
- [x] `extension/src/entrypoints/background.ts`:
  - `setPanelBehavior({ openPanelOnActionClick: false })`, set explicitly because Chrome keeps the
    old `true` across updates;
  - `action.onClicked` → `handleActionClick`.
- [x] `extension/src/features/generate/page-state.ts`:
  - `isPageAccessChanged(message, sender, ownId)` accepts only the valid message, from cv-snap's
    own ID;
  - `browserPageStateApis().subscribe` adds and removes a `runtime.onMessage` listener that
    refreshes on it.

### Key Decisions

- **The panel is opened for the click's window** (`{ windowId }`), so the global side panel
  (`side_panel.default_path`) keeps working on every tab, as before.
- **No extra fallback timers.** A panel that the click opens reads the page when it starts. One
  that was already open gets the message. Nothing else needs to poll.
- **The schema lives next to its handler** (`action-click.ts`) rather than in `job-ad/messages.ts`.
  The message belongs to the generate feature, and the background and the panel both import it
  from there.

### Deviations from Plan

None. No manifest change: `action.onClicked` needs no permission, and `sidePanel.open` is covered
by `sidePanel`.

### Dependencies Added

None.

### Developer Notes

- The dev build (`pnpm build`) contains `openPanelOnActionClick:!1` and the `action.onClicked`
  listener. Reload the unpacked extension to pick it up.
