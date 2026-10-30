---
stage: test
bolt: 018-store-ready-extension
created: 2026-10-30T20:45:00Z
---

## Test Report: store-ready-extension (toolbar icon opens the panel)

### Summary

- **Tests**: 1,081 passed, 1 skipped locally on Windows (`pnpm test`); 10 new.
- **Lint, typecheck, Prettier**: clean.
- **Build**: the dev build contains `openPanelOnActionClick:!1` and the `action.onClicked`
  listener.
- **CI**: after the fix commit is pushed (required before Operations resumes).

### Test Files

- [x] `extension/src/features/generate/action-click.test.ts` (4 new):
  - the panel is opened for the click's window synchronously, inside the user gesture;
  - then `page-access-changed` is sent;
  - a missing receiver is ignored, with nothing logged;
  - a failed open is logged, doesn't throw, and sends nothing.
- [x] `extension/src/features/generate/page-state.test.ts` (5 new): `isPageAccessChanged`
  accepts the message from cv-snap's own ID only, and ignores another type, no message, another
  sender or no sender ID.
- [x] `extension/src/features/generate/GenerateView.test.tsx` (1 new): "click the cv-snap icon"
  → the page is read again → "Add this site", without remounting the panel.

### Acceptance Criteria Validation

- ✅ **Panel open with the "click the icon" hint → click → the panel stays open and shows "Add this
  site"** (action-click, page-state, GenerateView; manual check below)
- ✅ **Panel closed → click on a job ad → the panel opens with "Add this site" or Generate**
  (action-click; the panel reads the page on start, existing GenerateView tests; manual check)
- ✅ **A click never closes the panel** (built-in behaviour off; `sidePanel.open` only; manual
  check)

### Issues Found

None.

### Manual check (Chrome, the clean test profile): ✅ passed 2026-10-30 (user)

Reload cv-snap (⟳) in `chrome://extensions` after `pnpm build`.

1. Open a job ad on a site that isn't allowed yet. Open the panel on another tab and switch to the
   ad, so the panel shows "click the cv-snap icon…". Click the icon once → the panel stays open
   and shows **Add this site**.
2. Click the icon again → the panel stays open.
3. Close the panel (✕). Click the icon on the ad → the panel opens with **Add this site**.
4. Click **Add this site** → Allow → **Generate CV** without a reload.
5. On `chrome://extensions`, click the icon → the panel opens and says cv-snap works on https://
   pages only.
