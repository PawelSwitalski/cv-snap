---
stage: test
bolt: 024-history-ui
created: 2026-11-03T16:46:47Z
---

## Test Report: 002-history-ui (bolt 024)

### Summary

- **Tests**: 1283/1284 passed, 1 skipped (unchanged: the shell-launcher test that runs only off Windows); 53 new since bolt 023
- **E2E**: `pnpm test:e2e` 1/1 passed
- **Real-browser checks (one-off, not committed)**:
  - **UI flow** (Implement stage): no hint before the first download; hint and Mark as sent after it; the History row and its actions; sent status survives a panel reload; the no-match state.
  - **Performance** (this stage): 500 seeded entries in Playwright's Chromium. Rendering all 500 rows took **482–859 ms**, over the target. With the first page of 50 and "Show more", the History view showed in **393 ms** on first open (including its lazy chunk), then **26–30 ms**.
- Typecheck, lint, `format:check` green

### Test Files

- [x] `extension/src/features/history/store.test.ts` - Search ignoring case and diacritics, sent filter combined with search, `todayLocal`, load with unreadable entries, failed load, sent / not sent seen by every reader, future date refused, delete, list refreshed after a recorded download, query and filter kept
- [x] `extension/src/features/history/HistoryView.test.tsx` - Order and row content, host / untitled names, search + filter + clear, open PDF / saved page / original ad, no "open ad" without an address, row buttons described by the ad name, delete only after confirming, mark as sent from a row, empty and unreadable notes, Back, focus from the hint, first 50 of 500 then "Show more", search across all 500, a focused entry beyond the first page still rendered
- [x] `extension/src/features/history/SentStatus.test.tsx` - Mark as sent today, change the date (`max` = today, future typed date ignored), mark as not sent, calendar dates formatted without time-zone shift (EN, PL)
- [x] `extension/src/features/history/HistoryHint.test.tsx` - Key read after the 300 ms debounce, nothing without a detected ad, tab switch never shows the old key, re-read on in-page navigation, unreadable ad gives no key; hint texts for downloaded and sent, "Show in history", nothing for another offer or no ad
- [x] `extension/src/features/history/ad-key-of-tab.test.ts` - Capture without a snapshot gives the same `AdKey` as the history; null when nothing is captured
- [x] `extension/src/features/history/history-repository.test.ts` - `setSentOn` changes only the date on both adapters; false for a deleted entry (+2 × 2)
- [x] `extension/src/lib/fold-text.test.ts` - Diacritics including ł, ß, ø, æ; case and space folding
- [x] `extension/src/features/job-ad/messages.test.ts` - Capture request with `withSnapshot: false` (+1)
- [x] `extension/src/features/shell/view.test.ts` - History over home and editor, Settings over History, the notice first (+4)
- [x] `extension/src/entrypoints/sidepanel/App.test.tsx` - History from the header and back; the hint's link opens History focused on the entry; no History button without a history (+3)

### Acceptance Criteria Validation

- ✅ **History**: newest first with company, title, date and sent status; search ignoring case and diacritics; filter; every action works, Delete only after confirming; empty, no-match and unreadable states; EN and PL texts
- ✅ **Mark as sent**: today's date; the date can be changed, not to the future; not sent clears it; survives a re-download (`recordDownload` keeps `sentOn`, bolt 023 test) and a panel reload (real-browser check); also under the result in the Generate view
- ✅ **Hint**: shown before generating (tab's key) and after (result's key) with the right text; the link opens History focused on the entry; no hint for another fingerprint on the same URL; Generate is never blocked (the hint is separate from the button)
- ✅ **500 entries < 500 ms**: met in Chromium with the first page of 50 (393 ms first open, ~28 ms after); see Issues
- ✅ **Typecheck, lint, format, all tests, `pnpm test:e2e` green**

### Issues Found

- **Fixed: 500 rows were too slow.** Rendering every row took 482–859 ms in Chromium (634–659 ms in happy-dom).
  - Caching date formatters alone didn't help; the cost is the DOM.
  - The list now shows the first 50 matches and a "Show 50 more (N left)" button. Search and filter still cover every entry, and the hint's entry is always rendered.
- **Fixed: hint date could be a day off.** The hint showed the UTC date of the download, which can differ from the local date near midnight; it now uses the local calendar date. Found while implementing, so no test failed on it.

### Notes

- The History view and hint flows become permanent e2e tests in bolt 027.
- The pagination is a small deviation from the plan, made to meet its own performance criterion.
