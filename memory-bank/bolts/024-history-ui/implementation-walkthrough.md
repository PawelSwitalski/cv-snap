---
stage: implement
bolt: 024-history-ui
created: 2026-11-03T16:39:37Z
---

## Implementation Walkthrough: 002-history-ui (bolt 024)

### Summary

The panel has a History view, opened from a header button next to Settings. It lists every
downloaded CV with search, a sent filter, and actions to open the PDF, the saved page or the
original ad, and to delete. Each entry can be marked as sent on a date, in the History view or in
the Generate view after the download. The Generate view shows a hint when the ad in the tab
already has an entry.

### Structure Overview

- **One history store per panel** (Zustand), shared by the History view and the Generate view.
  Downloads go through it (`recordDownload`), so every view refreshes. Search and filter are a
  pure selector.
- **History view:** lazy-loaded like Settings, with Back; `deriveView` ranks it after Settings.
- **Mark as sent:** one component, used in a History row and under the result.
- **Hint:** a hook reads the tab's ad **without** a page snapshot (the capture request gained
  `withSnapshot: false`), computes its `AdKey`, debounced 300 ms; the hint component looks the key
  up in the store. After generating, the result's key is the fallback.

### Completed Work

- [x] `extension/src/features/history/store.ts` - History store (load, record download, sent date, delete, query, filter), `visibleEntries` (case- and diacritics-insensitive search, sent filter), `todayLocal`
- [x] `extension/src/features/history/HistoryView.tsx` - The History view: rows (company / host / "Untitled ad", title, date, sent status), Open PDF / saved page / original ad, Delete with confirmation, search, filter, empty / no-match / unreadable / failed states, focus on an entry
- [x] `extension/src/features/history/SentStatus.tsx` - Not sent ↔ sent on a date (picker with `max` = today, future dates also refused in code), localized date formatting
- [x] `extension/src/features/history/HistoryHint.tsx` - `usePageAdKey` (debounced, re-read on tab or URL change) and the hint with "Show in history"
- [x] `extension/src/features/history/ad-key-of-tab.ts` - Captures the tab's ad without a snapshot and returns its `AdKey`
- [x] `extension/src/features/history/history-repository.ts` - `setSentOn` (metadata only) in both adapters
- [x] `extension/src/lib/fold-text.ts` - `stripDiacritics` and `foldForSearch` (letter table moved from `cv-pdf/file-name.ts`, which now uses it)
- [x] `extension/src/features/job-ad/messages.ts`, `capture-from-tab.ts`, `entrypoints/job-ad.content.ts` - Optional `withSnapshot: false` on the capture request
- [x] `extension/src/features/generate/GenerateView.tsx` - Hint under the Generate button; sent status under the result once its entry exists; downloads saved through the store
- [x] `extension/src/features/shell/PanelHeader.tsx` - History button next to Settings
- [x] `extension/src/features/shell/view.ts`, `view.test.ts` - `history` view and its order (+4 cases)
- [x] `extension/src/entrypoints/sidepanel/App.tsx`, `main.tsx` - History store, view state and focus, header button, real actions (open PDF, saved page, `tabs.create` for the ad)
- [x] `extension/public/_locales/{en,pl}/messages.json` - History, sent and hint texts (Polish hint worded without gendered verb forms)

### Key Decisions

- **History behind a header button, like Settings** (plan, confirmed by the user): it reuses the
  panel's navigation, and the Generate view keeps its space.
- **The hint reads the ad without a snapshot:** knowing the entry needs only the `AdKey`, so no
  page HTML is cleaned or stored for a hint. Content scripts of an older build ignore the flag and
  send a snapshot, which is simply unused.
- **Row buttons are described by the row's ad name** (`aria-describedby`), so "Delete" or
  "Open PDF" is unambiguous with a screen reader.

### Deviations from Plan

- After the download, the sent control appears **under the result** (once its entry exists), not
  inside `ResultView`. It is the same component and the same behaviour; `ResultView` stays
  independent of the history store.

- **Added in the Test stage:** the list shows 50 rows at a time with "Show more" (500 rows
  measured 0.5–0.9 s in Chromium), and date formatters are cached (`lib/date-format.ts`). See
  the test report.

### Dependencies Added

None.

### Developer Notes

- One-off check in Playwright's Chromium (not committed; bolt 027 makes it permanent):
  - no hint before the first download;
  - after Download PDF: "Saved to history.", the hint, and Mark as sent;
  - the History view opened in 341 ms including the lazy chunk, and the row showed the host
    (the fixture ad has no company), the title, the date and all actions;
  - Mark as sent changed the row and the hint ("… and sent it on …") and survived a panel reload;
  - searching "zzz" showed "No entries match."
- Component and unit tests for the new pieces are written in the Test stage.
