---
stage: plan
bolt: 011-tailored-cv-ui
created: 2026-10-29T13:05:16Z
---

## Implementation Plan: tailored-cv-ui (generate, preview and editing, errors)

### Objective

Make cv-snap usable end to end for the first time. Generate is one click on an allowed page with a
detected ad, shows progress you can cancel, and opens a preview. The preview shows the requirements,
the gaps, unverified lines (which you can edit or remove), what two-page fitting dropped, and an
output-language override, and it downloads a PDF identical to what it shows. Every error code has a
PL/EN message with a fix, and no async state can get stuck.

### Deliverables

**Background (generation service)**
- Wire `serveGenerationPort` into `background.ts` for ports named `cv-snap-generation`. Deps: a
  `GenerationPipeline` built from `createTailoringServices()` (the background's own native-host
  connection), `ChromeStorageProfileRepository` (confirmed profile), and a `captureAd` adapter.
- `captureAd` adapter over `captureFromTab`. Failures become typed errors:
  `JOB_AD_NOT_DETECTED` (reason `SELECTION_TOO_SHORT` when that applies) and `SITE_NOT_ALLOWED`
  (carried as `JOB_AD_NOT_DETECTED` with reason `SITE_NOT_ALLOWED`; still no new `ErrorCode`).

**Page state (story 005)**
- `features/generate/page-state.ts`: for the active tab of the panel's window, works out
  `unsupported` (non-https / chrome://), `site-not-allowed`, `ad-detected` or `no-ad`. It uses the
  granted host permissions plus the tab's stored job-ad status (`readJobAdStatus`, storage.session).
  It re-evaluates on tab activation/update, on permission changes and on job-ad status changes, so
  after "Add this site" is approved the button becomes Generate without a reload.
- `GenerateButton`: one button whose label and action depend on page state. Generate / Add this
  site / "Select the ad text, then Generate" (no-ad: Generate still runs, and the content script
  takes the selection, FR-8) / disabled with a reason (unsupported page, profile not confirmed).

**Generation session (stories 005–007)**
- `features/generate/store.ts`: Zustand store per panel. Status is `idle → running(step) →
  result | error`. It holds the request (tab id, ad title once known, override), the
  `GenerationResult`, and the user's changes (edited lines, removed lines).
- `features/generate/generation-client.ts`: opens a port per run and maps events to the store.
  Cancel disconnects the port (the background aborts and the host kills `claude`) and returns the
  UI to ready immediately, without waiting for any reply, so it takes well under 2 s. A port that
  disconnects without a terminal event becomes `HOST_DISCONNECTED`. A UI-side watchdog
  (pipeline watchdog + margin) is the last guarantee that the UI leaves the loading state.
- `GenerationProgress`: step list with an `aria-live="polite"` announcement and a Cancel button.
  Each pipeline `ProgressStep`, plus the panel's own `rendering` step, gets a PL/EN label.

**Preview and editing (story 006)**
- `features/generate/user-changes.ts` (pure): applies edits and removals to the plan. Returns the
  edited plan and a map from edited line positions back to the original `LineId`s, so verdicts from
  `revalidate` stay attached to the right lines after removals shift indices.
- `features/generate/preview-model.ts` (pure): `buildCvModel` of the edited plan, plus a per-bullet
  annotation (`LineId`, status, user-edited). The preview and the PDF use the same `CvModel`.
- `features/generate/render-session.ts`: runs `renderFittedCv` on the result and again after edits
  (debounced). It keeps the fitted model, the dropped list and the PDF blob, so the download is
  exactly the PDF that was fitted. A stale render is discarded when a newer one starts.
- `CvPreview` (HTML rendering of the fitted `CvModel`, single column, 320–600 px):
  - an unverified line shows an icon and the text "Unverified", with Edit and Remove;
  - an edited line shows "Edited by you";
  - a removed line can be restored with undo.
- `RequirementsPanel` (title, company, must/nice-to-haves, keywords; "from cache" note),
  `GapsList`, `UnverifiedSummary` (count + jump to the first unverified line), `DroppedList` (what
  two-page fitting dropped).
- `LanguageOverride`: "CV language: <auto: from ad / Polish / English / other…>" plus Regenerate.
  The choice is sent as `override` for that run only and is not stored. Regenerate re-runs the same
  tab and ad, and the cached requirements make it skip the parse call.
- Download: `downloadPdf(blob, buildCvFileName(...))` from bolt 009. If every remaining line is
  unverified, a strong-warning AlertDialog appears first.
- The preview is a lazy chunk (react-pdf is large), so it doesn't count against panel startup.

**Errors and recovery (story 007)**
- `error-messages.ts`: a complete `Record<ErrorCode, MessageKey>`, adding `JOB_AD_NOT_DETECTED`,
  `INVALID_MESSAGE` and `PDF_PARSE_FAILED` (generic). Every message ends with a fix hint
  (e.g. "Run `pnpm run install-host`").
- `GenerationError` (`role="alert"`) with one action per code:
  - `HOST_DISCONNECTED`: Reconnect. The next request reconnects the background's client
    (existing behaviour); if the host is missing, the message changes to `HOST_NOT_INSTALLED`.
  - `GENERATION_TIMEOUT` / `GENERATION_FAILED` / `MODEL_UNAVAILABLE`: one-click Try again (same
    request).
  - `JOB_AD_NOT_DETECTED`: the selection hint.
  - `CLAUDE_*`: the setup-check fix.
- When `navigator.onLine` is false, an extra line points to the internet connection and Claude
  availability.
- `ErrorBoundary`: add a "Try again" that resets the boundary, next to Reload, so a render error in
  the preview doesn't lose the profile view.
- `CANCELLED` is never shown as an error (consistent with bolt 010).

**Shell**
- `HomeView`: the disabled placeholder is replaced by `GenerateView` (page state → button →
  progress/preview/error). Edit profile and Upload new are disabled while a run is in progress.
- About 45 new message keys in `en` and `pl`, keeping both files in parity.

### Dependencies

- `GenerationPipeline`, `serveGenerationPort`, `revalidate` (bolt 006): already built, wired here.
- `captureFromTab` + selection fallback (bolt 008), and `readJobAdStatus` (badge state).
- `createAllowedSites().addCurrentTab` (bolt 007), and `permissions.onAdded` injection into open
  tabs (bolt 007).
- `buildCvModel`, `renderFittedCv`, `downloadPdf`, file naming, GDPR clause (bolt 009).
- The profile store and repository, i18n, the error boundary and the shadcn components (bolt 010).
- No new npm dependencies expected.

### Technical Approach

- The pipeline runs in the **background worker** (ddd-02 decision 8). An open native port keeps the
  service worker alive during a run. The panel only talks to a `chrome.runtime` port, and closing the
  panel disconnects it, which cancels the run (already tested in bolt 006).
- **Tab changes during a run**: the request carries the tab id captured at click time, so a tab
  switch has no effect on it. The result is labelled with `requirements.title`/`company`.
- **Model**: `DEFAULT_MODEL` until the settings panel (bolt 012) adds the model setting. The
  setting is read through one function, so bolt 012 only changes that function.
- **Profile for preview and revalidation**: the confirmed profile from the profile store. Editing
  the profile is blocked during a run, so the profile can't change under the result.
- **GDPR clause and photo**: the clause stays off until settings exist (bolt 012). The photo comes
  from IndexedDB, as in bolt 009.
- **Tests**: Vitest plus Testing Library. Chrome APIs are faked at the port and tabs/permissions
  adapters, and the pipeline is faked at its `run`. The real `claude` is never called. react-pdf
  render passes use bolt 009's real renderer in one integration test, and a fake measure elsewhere.

### Open Decision (needs your call)

**Reading the URL of an unlisted tab for "Add this site".** Without the `tabs` permission or host
access, Chrome hides `tab.url`. So on an unlisted page the panel can tell that the site isn't allowed,
but it can't tell which origin to request. Options:

1. **Add `activeTab`** (no install warning). Chrome grants it for the tab where the user clicked
   the cv-snap icon, so "Add this site" works there with one click. After a tab switch, the button
   says "Click the cv-snap icon on this page to add it". This relaxes "no `activeTab` dependency"
   in the architecture standard (for the URL only; generation still needs a granted site). Whether
   Chrome grants `activeTab` when the icon opens the side panel needs a manual check in Stage 3.
2. **Optional `tabs` permission**, requested on the first "Add this site". Two prompts (`tabs`,
   then the site), and Chrome's "Read your browsing history" warning.
3. **No new permission**: on an unlisted page, "Add this site" opens a small field to paste or type
   the site address (and presets, as in settings).

### Acceptance Criteria

- [ ] Generate starts a run with no further input on an allowed page with a detected ad and a
      confirmed profile
- [ ] An unlisted page shows "Add this site"; after approval it becomes Generate without a reload
- [ ] Progress steps are shown and announced via `aria-live="polite"`
- [ ] Cancel or closing the panel stops the run within 2 s and the UI returns to ready
- [ ] With no ad detected, Generate guides the user to select the ad text (manual fallback)
- [ ] A tab switch during a run doesn't affect it; the result is labelled with the ad's title
- [ ] The result shows the CV preview, parsed requirements, the gaps list and an unverified-lines summary
- [ ] Unverified lines are marked with an icon and text (not only colour) and can be edited or removed
- [ ] An edited line is marked "Edited by you" and excluded from validation
- [ ] The language override + Regenerate produces the CV in that language for that run only
- [ ] Items dropped by two-page fitting are listed
- [ ] The downloaded PDF matches the preview (same fitted model)
- [ ] Download warns strongly when every line is unverified
- [ ] Every `ErrorCode` has a PL and EN message with a fix hint (a test enumerates them)
- [ ] `HOST_DISCONNECTED` offers Reconnect; `GENERATION_TIMEOUT` offers one-click retry
- [ ] Every error in every async state leaves the loading state (including a silent port drop)
- [ ] An unexpected render error shows the recovery screen, not a blank panel
- [ ] An error while offline mentions network/Claude availability
- [ ] No hard-coded UI strings (lint rule); the preview is lazy and panel startup stays ≤ 500 ms
