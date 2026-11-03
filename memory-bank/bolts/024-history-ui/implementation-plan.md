---
stage: plan
bolt: 024-history-ui
created: 2026-11-03T16:31:39Z
---

## Implementation Plan: 002-history-ui (bolt 024)

### Objective

The user can see and use the history built by bolt 023: a History view listing every downloaded
CV (search, filter, open, delete), a "sent" status with a date, and a hint in the Generate view
when the ad in the tab already has an entry.

### Deliverables

1. **History store** (`features/history/store.ts`, Zustand, one per side panel). It is shared by
   the History view and the Generate view, so a download, a status change or a delete shows up
   everywhere at once.
   - State: `status`, `entries`, `unreadable`, `query`, `filter` (`all`, `sent`, `not-sent`).
   - Actions: `load()`, `remove(adKey)`, `setSentOn(adKey, date | null)`, `setQuery`,
     `setFilter`, `entryFor(adKey)`.
   - `recordDownload` (bolt 023) is called through the store, so the list refreshes after
     Download PDF.
   - Pure selector `visibleEntries(entries, query, filter)`. The search folds case and
     diacritics: "lodz" finds "Łódź", and "zolc" finds "Żółć". It reuses the letter table of
     `cv-pdf/file-name.ts`, moved to a small `lib/fold-text.ts`.
2. **Repository**: `setSentOn(adKey, sentOn)` changes the metadata only, never the files. It is
   implemented in both adapters.
3. **History view** (story 001), `features/history/HistoryView.tsx`, lazy-loaded.
   - **Opening it:** a "History" button in the panel header next to Settings; it has a Back
     button like Settings. `deriveView` gains `history`, ranked after settings and before
     editor/home.
   - **Rows:** company (or the ad's host, or "Untitled ad"), title, last-downloaded date, and
     sent status with its date.
   - **Row actions:** Open PDF, Open saved page, Open original ad (only with a URL), Mark as
     sent / Mark as not sent, and Delete (with a confirmation dialog).
   - **Above the list:** a search box and the All / Sent / Not sent filter.
   - **Other states:** an empty state ("CVs appear here after you click Download PDF"), a
     "no entries match" state with a Clear button, and a note when some records couldn't be
     read.
   - `focusAdKey` (from the hint's link) scrolls to that row and focuses it.
4. **Mark as sent** (story 002), `features/history/SentStatus.tsx`, used in both views.
   - Not sent: a "Mark as sent" button, which sets today's date.
   - Sent: "Sent on {date}", a date field (`<input type="date" max=today>`, with future dates
     also refused in code) and a "Mark as not sent" button.
   - Dates are local calendar dates (`YYYY-MM-DD`) from a pure `todayLocal(now)`.
   - In the Generate view, after Download PDF, the control appears for the current ad's entry.
5. **Already-in-history hint** (story 003), `features/history/HistoryHint.tsx` in the Generate
   view.
   - Text: "You downloaded a CV for this ad on {date}", or "… and sent it on {date}", with a
     "Show in history" link. It never blocks Generate.
   - **After generating,** the key is `result.ad.adKey`.
   - **Before generating** (`ad-detected` page state): the panel asks the tab's content script
     for the ad **without a snapshot**. The capture request gains `withSnapshot: false`; it
     defaults to true, and older content scripts ignore it. The panel then computes the `AdKey`
     with the shared helper and looks it up. This is debounced (300 ms) and redone when the page
     state changes. Errors simply mean no hint.
   - Same URL with a different offer (justjoin.it): no hint, because the `AdKey` includes the
     content fingerprint.
6. **Texts (EN/PL)**: header button, view title, columns, actions, filter, search, empty,
   no-match and unreadable notes, delete dialog, sent texts, hint.

### Dependencies

- Bolt 023's repository, `recordDownload` and `openSavedPdf`/`openSavedPage`.
- `tabs.create` for "Open original ad", which needs no permission for a plain URL.
- No new packages or permissions.

### Technical Approach

- **The view sits behind a header button, like Settings,** rather than in a tab bar. It is the
  same navigation pattern the panel already uses, so the Generate view keeps its space.
- **One store for both views,** so "sent" set in the Generate view shows in the History view,
  and a delete clears the hint.
- **Plain list:** 500 rows of small metadata render well under 500 ms. I'll measure this in the
  Test stage, and virtualise only if the target is missed.

### Acceptance Criteria

- [ ] History lists entries newest first with company, title, date and sent status. The search
  ignores case and diacritics. The filter works. Every row action works (Delete only after
  confirming). Empty, no-match and unreadable states are shown. EN and PL texts.
- [ ] Mark as sent sets today's date. The date can be changed but not to the future. Not sent
  clears it. The status survives a re-download and a reload of the panel. It is also available
  in the Generate view after the download.
- [ ] Hint: shown for an ad with an entry, before and after generating, with the right text for
  sent and not sent. The link opens History focused on the entry. No hint for other ads (a
  different fingerprint on the same URL). Generate isn't blocked.
- [ ] 500 entries: the History view is shown in < 500 ms (component test).
- [ ] Typecheck, lint, format, all tests and `pnpm test:e2e` pass.
