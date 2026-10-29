---
stage: implement
bolt: 011-tailored-cv-ui
created: 2026-10-29T13:21:08Z
---

## Implementation Walkthrough: tailored-cv-ui (generate, preview and editing, errors)

### Summary

Home now runs the full one-click flow. A Generate button adapts to the page in the active tab.
Progress has a Cancel button that returns the panel to ready at once. The preview shows the fitted
CV with unverified and edited lines marked, plus the requirements, gaps, dropped content and a
language override, and its download is exactly the PDF that was previewed. Every error code has a
PL/EN message, a fix hint and one recovery action, and the panel's error screen can now recover
without a reload.

### Structure Overview

- **Background worker**: serves one generation port per side panel. It runs the bolt 006 pipeline
  on its own native-host connection, created on the first run, and accepts ports only from
  extension pages.
- **Side panel**: the new `features/generate` feature has three layers:
  - pure logic: page state, preview model, line-ID mapping;
  - a Zustand store with a port client: the session and the edits;
  - React views: button, progress, error, and a lazy-loaded result view with the preview.

  The result view renders through bolt 009's two-page fitter. The fitted model is both what the
  preview shows and the PDF that is downloaded.

### Completed Work

- [x] `extension/wxt.config.ts` - `activeTab` permission (decision at Stage 1), with a comment on its limited use
- [x] `extension/src/entrypoints/background.ts` - generation port wiring: lazy pipeline (profile repository, cached requirements, tailoring), capture adapter, sender checks
- [x] `extension/src/features/generation/capture-ad.ts` - the tab's ad or selection, or a typed `JOB_AD_NOT_DETECTED` error whose `reason` says why
- [x] `extension/src/features/generate/page-state.ts` - page state of the panel's active tab (unknown site, unsupported, not allowed, no ad, ad detected), kept current on tab, permission and detection changes, with real browser adapters
- [x] `extension/src/features/generate/generation-client.ts` - one port per run: progress, exactly one result or error, cancel by disconnect, lost connection and panel-side watchdog as errors
- [x] `extension/src/features/generate/store.ts` - generation session store: generate, regenerate with a per-run language override, retry, cancel, dismiss, line edit/remove/restore; stale runs are ignored
- [x] `extension/src/features/generate/preview-model.ts` - edited plan → CV model, revalidated verdicts, per-line annotations, and the mapping from printed positions to the generated plan's line IDs
- [x] `extension/src/features/generate/use-fitted-cv.ts` - two-page fitting and the final PDF; immediate on the first result, debounced after edits; stale renders discarded
- [x] `extension/src/features/generate/GenerateButton.tsx` - the adaptive button: Generate, Add this site, selection hint, or disabled with the reason
- [x] `extension/src/features/generate/GenerationProgress.tsx` - step list, polite live announcement, retry note, Cancel
- [x] `extension/src/features/generate/GenerationError.tsx` - message, fix hint, offline line, one action per code (Reconnect, Try again, "Text selected: generate"), back to result
- [x] `extension/src/features/generate/CvPreview.tsx` - HTML preview of the fitted model with unverified and user-edited markers (icon + text), inline edit, remove
- [x] `extension/src/features/generate/ResultView.tsx` - ad label, unverified summary with jump-to-line, requirements, gaps, CV language override + Regenerate, removed lines with restore, dropped list, download with the all-unverified warning
- [x] `extension/src/features/generate/GenerateView.tsx` - container on home: page state, button, progress, error, lazy result view
- [x] `extension/src/features/shell/HomeView.tsx` - the generate flow replaces the placeholder; profile actions are disabled during a run
- [x] `extension/src/features/shell/PanelError.tsx` - "Try again" resets the error boundary; Reload stays as the fallback
- [x] `extension/src/lib/i18n/error-messages.ts` - complete code → message and code → fix maps, plus messages for sub-causes (selection too short, site not allowed, profile not confirmed)
- [x] `extension/src/entrypoints/sidepanel/App.tsx`, `main.tsx` - generate store and dependencies wired in (port, page-state APIs, "Add this site")
- [x] `extension/public/_locales/{en,pl}/messages.json` - 86 new keys in each file, keeping parity; the old placeholder key removed
- [x] `memory-bank/standards/system-architecture.md` - permissions now list `activeTab` and state its limited use

### Key Decisions

- **Cancel is a disconnect**: the panel closes its port and shows ready immediately. The background
  aborts on disconnect, and the host kills `claude`. (`serveGenerationPort` had no tests from
  bolt 006; Stage 3 added them.) The 2-second limit doesn't depend on any reply arriving.
- **A port that closes without an answer is `HOST_DISCONNECTED`**, and a panel-side watchdog
  (pipeline watchdog + 15 s) ends a run even if the worker dies. The panel always leaves the
  loading state.
- **Unknown address means "click the icon here"**: with `activeTab`, the URL is visible only where
  the icon was clicked, or on granted sites. Any other tab says so instead of guessing.
- **Line IDs always refer to the generated plan**: removals shift positions, so the preview maps
  printed lines back to their original IDs. This mirrors how the CV model keeps one copy of a
  repeated item. Verdicts, edits and restore stay attached to the right lines.
- **Preview = PDF**: an edit shows at once (the unfitted model). As soon as the fit for exactly that
  model is ready, the preview switches to the fitted model, and Download saves the PDF fitted from
  it. Download is disabled until then, so it never offers a PDF that doesn't match the preview.
  (Changed in Stage 3: the first version kept showing the previous fit until the re-fit finished,
  so edits and removals appeared only after a delay.)
- **Every line is editable, unverified ones prominently**: the actions on unverified lines are
  always visible; on other lines they appear on hover or keyboard focus.
- **Separate `fix_*` texts for generation**: the setup check keeps its `hint_*` texts ("…then click
  Check again"), and the generate flow says "…then click Try again".
- **Background accepts generation ports only from extension pages** (a sender without a tab), so a
  content script in a web page can't start a generation.

### Deviations from Plan

- **GDPR clause**: the plan said "off until settings". The result view instead applies bolt 009's
  default setting (Polish ads only, with the default text), because it is the product default and
  the settings panel will only change its source.
- **Removed lines list with Restore** replaces "undo"; it stays available for the whole session,
  not just for the last removal.
- The CV language select offers Automatic plus common languages (pl, en, de, fr, es, it, uk) and the
  current output language. The names come from `Intl.DisplayNames` in the UI language.

- **Added in Stage 3 (user decision):** the last result and its edits are kept in
  `chrome.storage.session` and shown again when the panel reopens. They are cleared when the
  active profile changes (`lib/storage/local-store.ts` session adapter, `generate/store.ts`, App
  wiring). `wxt.config.ts` also pre-bundles react-pdf in dev, because Vite reloaded the panel when
  it found react-pdf at the first result.

### Dependencies Added

None.

### Developer Notes

- Build: main side panel chunk 256 kB plus a shared chunk of 199 kB (components and zod) loaded at
  start. The result view chunk is 1.22 MB (react-pdf) and loads only with the first result. The
  "Preparing the preview…" text covers that load.
- The manifest has gained one permission, `activeTab`, which has no install warning. There are
  still no host permissions.
- The model is still `DEFAULT_MODEL`; bolt 012 changes the store's `model` dependency only.
- Manual checks for Stage 3:
  - Chrome grants `activeTab` when the icon opens the side panel;
  - Cancel takes under 2 s on a real run;
  - "Add this site" turns into Generate without a reload;
  - the downloaded PDF matches the preview;
  - panel startup time.
