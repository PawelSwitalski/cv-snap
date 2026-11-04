---
stage: plan
bolt: 027-e2e-tests
created: 2026-11-04T11:05:00Z
---

## Implementation Plan: 004-e2e-tests (bolt 027)

### Objective

One end-to-end test file covers the history flow on the bolt 022 harness: the real side panel, the
real host with the fake provider, the real IndexedDB history. It checks download → History, sent
date, saved page, search and filter, retention, and delete.

### Deliverables

1. **History helper for the harness** (`e2e/harness/history.ts`), test-only. It runs inside the
   extension's service worker and uses raw IndexedDB on the two history databases
   (`cv-snap-history`/`meta`, `cv-snap-history-files`/`files`, the `idb-keyval` layout). The
   extension itself gets no test-only code.
   - `historyEntries(serviceWorker)`: every entry's metadata.
   - `seedHistoryEntry(serviceWorker, entry, files)`: writes an entry with a small `%PDF` file and
     ad text. Used for the second entry, because the fake provider always returns the same job
     title and company.
   - `backdateHistoryEntry(serviceWorker, adKey, isoDate)`: moves `lastDownloadedAt` (and
     `createdAt`) into the past.
2. **Fixture ad gets a marker script** (`e2e/fixtures/pages/job-ad.html`). An inline script adds
   `<p id="e2e-script-ran">` only when it runs outside the job board's origin. On the live page it
   does nothing, so the one-click test is unaffected. If it ever ran in the saved-page viewer, the
   marker would appear.
3. **`e2e/tests/history.spec.ts`**, one test in steps (`test.step`), since every step builds on
   the previous one and a fresh browser per step would add ~5 s each:
   1. **Download → History**: generate and download, open **History**: one entry, "Senior
      Frontend Developer", Przykładowa Firma. Download again: still one entry, and
      `lastDownloadedAt` is later (read through the helper, because the list shows only the date).
   2. **Sent**: **Mark as sent** shows "Sent on {today}". Reload the panel and open History
      again: the sent date is still there.
   3. **Saved page**: **Open saved page** opens the viewer tab. Its frame shows the ad heading and
      has no `#e2e-script-ran`.
   4. **Search and filter**: seed a second, not-sent entry ("Backend Developer", "Inna Spółka").
      Search "inna" → only the seeded one. Clear, filter **Sent** → only the first. Filter **Not
      sent** → only the seeded one.
   5. **Retention and delete**: in Settings choose **Delete after** 1 month; nothing is expired
      yet, so no dialog. Backdate the seeded entry by 2 months and reload the panel: it is gone.
      **Delete** the remaining entry and confirm: History is empty, and the helper finds no
      entries.

### Dependencies

- Bolt 022 harness (`cvSnap`, `jobBoard`, `openSidePanel`), bolts 023–025 (history store, UI,
  retention). No new packages.

### Technical Approach

- Locators by role and the English UI text, as in `one-click.spec.ts`.
- **Panel reload:** `panel.reload()`. The privacy notice was already accepted, so the panel opens
  on Home.
- **Viewer tab:** wait for the context's `page` event when clicking **Open saved page**. The
  snapshot is in a sandboxed iframe, read with `frameLocator`.
- **Dates:** "today" is formatted the way the panel does it, in `en-US`; the helper uses ISO dates.
- **Retention cut-off:** the backdated date is 2 months before now, well past the 1-month cut-off
  whatever the day of the month.

### Acceptance Criteria

- [ ] After a download, History lists the entry; a second download leaves one entry with a later
  `lastDownloadedAt`
- [ ] Mark as sent shows the date, and it survives a panel reload
- [ ] The saved page shows the fixture ad, and the marker script never runs
- [ ] Search and the Sent / Not sent filters leave the right rows
- [ ] A backdated entry is gone after a reload with "Delete after 1 month"; Delete removes the
  other entry
- [ ] `pnpm test:e2e` green (both tests); typecheck, lint, format and `pnpm test` green
