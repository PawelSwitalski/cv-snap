---
stage: test
bolt: 011-tailored-cv-ui
created: 2026-10-29T13:43:23Z
---

## Test Report: tailored-cv-ui (generate, preview and editing, errors)

### Summary

- **Tests**: 866/866 passed across the repo (`pnpm test`). The extension has 447, of which 71 are
  new in this bolt, in 11 new files and 3 extended ones.
- **Coverage** (bolt 011 code): 88.4% lines, 86.2% statements, 75.4% branches. The main gap is
  `browserPageStateApis`, the real Chrome event adapter, which the manual check covers. Without
  it, page-state logic is fully covered.
- **Typecheck, lint, Prettier**: clean. The production build passes.
- **Manual Chrome check**: passed (user, 2026-10-29)

### Test Files

- [x] `extension/test/generate-fixtures.ts` - fake panel port and connector, page-state fakes, fake fitted renderer, generation results built with the real validator
- [x] `extension/src/features/generation/generation-port.test.ts` - background port: capture → progress → one result; panel disconnect aborts the run and posts nothing more; typed capture errors; malformed and concurrent requests; no internal details leak
- [x] `extension/src/features/generation/capture-ad.test.ts` - ad or selection returned; not detected / selection too short / site not allowed become `JOB_AD_NOT_DETECTED` with the reason; cancel during capture
- [x] `extension/src/features/generate/page-state.test.ts` - every page state (wildcard patterns, the broad pattern ignored, hidden address, non-https, stale status URL); updates on events (grant → no ad → ad detected); older reads never win; API failure → no-tab
- [x] `extension/src/features/generate/generation-client.test.ts` - one result or error; late events ignored; silent port drop → `HOST_DISCONNECTED`; cancel reports nothing; panel watchdog → `GENERATION_TIMEOUT`; unreachable background
- [x] `extension/src/features/generate/store.test.ts` - idle → running → result; Cancel to ready at once (or back to the earlier result); per-run override; retry of the same request; offline flag; error dismiss; edits/removals/restore reset on a new result; replaced runs ignored
- [x] `extension/src/features/generate/preview-model.test.ts` - unverified verdicts; edited lines printed in the user's words, `skipped`, not validated; removed lines out of the CV and the verdicts; original line IDs kept after positions shift; repeated items; determinism; all-unverified detection
- [x] `extension/src/features/generate/preview-parity.test.ts` - **real react-pdf render** of a long CV with an edit and a removal: the PDF has every line of the fitted model, the edit, and none of the removed or dropped lines
- [x] `extension/src/features/generate/ResultView.test.tsx` - download saves the PDF fitted from the model on screen with the right file name; disabled while an edit is re-fitted; all-unverified warning dialog; no warning otherwise; render failure shown, no endless spinner
- [x] `extension/src/features/generate/GenerateView.test.tsx` - one-click Generate; polite progress and Cancel under 2 s; preview with requirements, gaps and the unverified summary; marking (text, not colour) and editing; remove and restore; language override; selection guidance; Add this site → Generate without a reload; refused access; click-the-icon state; Reconnect; retry and offline hint; dropped list
- [x] `extension/src/lib/i18n/error-messages.test.ts` (extended) - every `ErrorCode` has a message **and** a fix hint in PL and EN (no missing keys); install command named for host errors; reason-specific messages
- [x] `extension/src/features/shell/ErrorBoundary.test.tsx` (extended) - Try again recovers from a render error without a reload
- [x] `extension/src/entrypoints/sidepanel/App.test.tsx` (extended) - from home: Generate, profile actions locked during the run, preview on the result

### Acceptance Criteria Validation

**Story 005-generate-flow-with-progress-and-cancel**
- ✅ **Generate starts with no further input on an allowed page with an ad and a confirmed profile** (GenerateView, store, App)
- ✅ **Unlisted page → "Add this site" → Generate without a reload** (GenerateView, page-state) (confirmed in the manual check)
- ✅ **Progress shown and announced via `aria-live`** (GenerateView, generation-port)
- ✅ **Cancel or closing the panel stops the run within 2 s; UI returns to ready** (store, generation-client, generation-port, GenerateView) (confirmed in the manual check)
- ✅ **No ad detected → guided to the manual selection** (GenerateView, capture-ad)
- ✅ **Tab change during a run: the run keeps the tab it started on; the result is labelled with the ad's title** (store, GenerateView)

**Story 006-preview-and-editing**
- ✅ **Preview with parsed requirements, gaps and an unverified-lines summary** (GenerateView, ResultView)
- ✅ **Unverified lines marked with an icon and text; editable and removable** (GenerateView, preview-model)
- ✅ **Edited line marked "user-edited" and excluded from validation** (preview-model, GenerateView)
- ✅ **Language override + Regenerate → that language for that run only** (store, GenerateView)
- ✅ **Items dropped by two-page fitting are shown** (GenerateView, preview-parity)
- ✅ **Downloaded PDF matches the preview** (preview-parity with the real renderer, ResultView)
- ✅ **Edge case: all lines unverified → strong warning before download** (ResultView)

**Story 007-error-messages-and-recovery**
- ✅ **Every `ErrorCode` → PL/EN message with a fix hint** (error-messages, enumerating `ERROR_CODES`)
- ✅ **Host disconnect → Reconnect** (GenerateView, generation-client)
- ✅ **`GENERATION_TIMEOUT` → one-click retry** (GenerateView, store)
- ✅ **Any error in any async state leaves the loading state** (generation-client: error, silent drop, watchdog, unreachable background; ResultView: render failure)
- ✅ **Unexpected render error → recovery screen, not a blank panel** (ErrorBoundary)
- ✅ **Edge case: error while offline mentions network/Claude availability** (store, GenerateView)

### Issues Found

- **Fixed: edits appeared late in the preview.** The preview showed the last fitted model until the
  debounced re-fit finished, so an edit or removal appeared only after a delay. Now the current
  model shows at once, and the fitted model replaces it only when it was fitted from that exact
  model; Download is enabled only then (`currentFit`).
- **Fixed (found in the manual check): Chrome refused to load the extension.** Four progress
  message keys contained hyphens (`progress_creating-profile`, …), copied from the step IDs.
  Chrome allows only `[A-Za-z0-9_]` in message keys. The keys now use underscores, and a catalog
  test checks every key and placeholder name against Chrome's rule. The unit tests read the JSON
  directly, so only loading the extension in Chrome showed the problem.
- **Fixed (found in the manual check): in `pnpm dev`, the result never appeared.** The background
  finished the run, but the panel came back to the Generate view. In dev mode, Vite found
  react-pdf only when the lazy preview chunk was first requested, re-optimized its dependencies
  and reloaded the side panel, which lost the in-memory result. `wxt.config.ts` now pre-bundles
  `@react-pdf/renderer` (`optimizeDeps.include`). Production builds were never affected. After
  the fix, the user confirmed the preview and the PDF download work.
- **Scope addition (user decision, found in the manual check): the CV disappeared when the panel
  was closed.** This was within the specs (the result lived only in memory; history is out of scope
  in story 006), but the user would lose the result and their edits. The last result, its edits and
  the request that produced it are now kept in `chrome.storage.session` (memory only, never on
  disk, cleared when Chrome closes, not readable by content scripts). They are shown again when the
  panel reopens. The copy is checked with a schema on read and cleared when the active profile
  changes, because a CV from the old profile no longer matches its facts. Closing the panel during
  a run still cancels it (FR-16). Tests: store (keep and restore, request of the shown result kept
  after a failed run, no overwrite of a new run, unreadable copy ignored, cleared on profile
  change), profile store (`onActiveChanged` on confirm), App (close and reopen shows the CV).
- **Fixed in the docs:** the Stage 2 walkthrough said the bolt 006 tests covered
  cancel-on-disconnect, but `serveGenerationPort` had no tests. They were added here.
- Not covered automatically: `browserPageStateApis` (real Chrome events), the real native
  host/`claude` run, and axe accessibility checks (axe isn't set up in the repo; tracked for a
  later bolt).

### Manual Chrome check (passed 2026-10-29, user)

Preparation: `pnpm run install-host`, then `pnpm dev`, then reload the unpacked extension. Chrome
shows no new install warning for `activeTab`. Have a confirmed profile.

1. **activeTab / Add this site:** open a job ad on a site that isn't allowed yet. Click the
   cv-snap icon. The button reads "Add this site". Click it → Chrome asks for that one site →
   allow → the button becomes "Generate CV" without reloading the page.
2. **Hidden address:** with the panel open, switch to another unlisted https tab without clicking
   the icon → "click the cv-snap icon on this page" is shown. Click the icon → "Add this site".
3. **Generate:** on the allowed ad, click Generate CV → the steps advance (with a screen reader,
   each step is announced) → the preview appears with the ad's title and company.
4. **Cancel:** start again and click Cancel → back to ready within 2 s. Check in Task Manager that
   no `claude` process stays running. Start again and close the side panel mid-run → same.
5. **Tab switch:** start a run, switch to another tab → the run finishes for the original ad (same
   title).
6. **Preview:** check the requirements (expand), gaps and unverified summary; "Show the first one"
   jumps to the line. Edit an unverified line → it shows at once as "Edited by you", and the count
   drops. Remove a line → it disappears; Restore brings it back.
7. **Language:** pick English → Regenerate → the CV and its headings are in English. Generate
   again from the button → back to the ad's language.
8. **Download:** download → open the PDF → it matches the preview (including the edit). For a
   long profile, the "Left out to fit two pages" list names what's missing from the PDF.
9. **No ad:** on an allowed non-ad page, the selection hint shows. Generate without a selection →
   the error with "Text selected: generate". Select the ad text → click it → it generates.
10. **Errors:** run `pnpm run uninstall-host` and Generate → the host message with its fix and a
    button. Reinstall → Try again works. Disconnect from the network and Generate → the offline
    line appears.
11. **Startup:** dev console `side panel first frame <ms>` ≤ 500 ms. The preview chunk loads only
    on the first result.
12. **Reopen:** after generating (and editing a line), close the side panel and open it again →
    the same CV with your edit is shown. Confirm an edited profile → the CV is gone. Restart
    Chrome → the CV is gone.
13. **Look:** dark mode and ~320 px width: the markers are readable, there's no horizontal
    scrolling, and Edit/Remove are reachable by keyboard (they appear on focus).

### Notes

- The tests never run the real `claude` CLI. Chrome is faked at the port and page-state adapters.
- The preview parity test uses the same react-pdf code path as the extension, in Node, read back
  with pdf.js.
