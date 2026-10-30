---
stage: plan
bolt: 018-store-ready-extension
created: 2026-10-30T19:45:00Z
---

## Implementation Plan: store-ready-extension (toolbar icon opens the panel)

### Objective

A click on the cv-snap icon always opens the side panel (never closes it) and makes the panel read
the page again, so "Add this site" appears at once on an unlisted job ad.

### Cause

- The background sets `sidePanel.setPanelBehavior({ openPanelOnActionClick: true })`. Chrome then
  opens the panel on a click, and current versions close it when it is already open.
- The click does grant `activeTab`, but Chrome sends no event for that. The open panel listens to
  tab, permission and badge events only, so it keeps the old "click the cv-snap icon" hint.

### Deliverables

**Background (`extension/src/entrypoints/background.ts`)**
- `setPanelBehavior({ openPanelOnActionClick: false })` on start. It is set explicitly because
  Chrome keeps the behaviour across updates of the extension.
- `action.onClicked` (it fires once the behaviour is off, and grants `activeTab`):
  1. `sidePanel.open({ windowId: tab.windowId })` straight away, with no `await` before it: Chrome
     requires the click's user gesture;
  2. once open, send `{ type: "page-access-changed" }` to the extension's pages
     (`runtime.sendMessage`); "no receiver" is ignored.
- The handler lives in a small testable module, `extension/src/features/generate/action-click.ts`,
  taking the browser APIs as a parameter (as the badge and capture modules do).

**Side panel (`extension/src/features/generate/page-state.ts`)**
- `browserPageStateApis().subscribe` also listens to `runtime.onMessage` and refreshes on a valid
  `page-access-changed` from cv-snap itself (`sender.id === runtime.id`); the schema sits next to
  the other message schemas.
- A panel that opens because of the click reads the page when it starts, so a message it misses
  changes nothing.

### Technical Approach

- No new permission: `action.onClicked` and `sidePanel.open` are covered by `sidePanel`, and the
  manifest stays the same (the manifest tests pin it).
- Tests:
  - `action-click.test.ts`:
    - the panel is opened for the click's window before anything is awaited;
    - the panel is then told to read the page;
    - a missing receiver is ignored;
    - a failed open is logged without throwing;
  - `page-state.test.ts`: `page-access-changed` refreshes the state; a message with another type,
    or from another sender, does not;
  - `GenerateView.test.tsx`: from "click the icon" to "Add this site" without remounting the panel.
- Release: after the bolt, `pnpm release:pack` again. The version stays 0.1.0, since nothing has
  been published yet. The store draft gets the new zip, and tag `v0.1.0` moves to the fix commit
  (with your approval, as it's a force-push of the tag).

### Acceptance Criteria

- [ ] Panel open with the "click the icon" hint → click the icon → the panel stays open and shows
  "Add this site"
- [ ] Panel closed → click the icon on a job ad → the panel opens with "Add this site" (or
  Generate on an allowed site)
- [ ] A click on the icon never closes the panel
