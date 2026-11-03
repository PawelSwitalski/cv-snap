---
stage: implement
bolt: 023-history-core
created: 2026-11-03T16:19:09Z
---

## Implementation Walkthrough: 001-history-core (bolt 023)

### Summary

Download PDF now saves the CV to a local history: one entry per ad, holding the exact PDF, the
ad's details and text, and a cleaned copy of the job-ad page taken when the ad was captured.
Saved PDFs open in Chrome's viewer. Saved pages open in a new extension page that shows them in a
sandboxed frame, where no page code can run. The History tab that lists entries comes in bolt 024.

### Structure Overview

- **Capture (content script):** the existing capture reply also carries a cleaned snapshot of the
  page. It is cleaned in an inert parsed copy, because the background worker has no DOM.
- **Generation port (background):** computes the ad's `AdKey` (the same helper as the
  requirements cache), keeps the snapshot as *pending* in IndexedDB under that key, and adds the
  ad's details (only the snapshot status, not the HTML) to the result it sends to the panel.
- **History feature (`features/history/`):**
  - the entry schema;
  - the repository port with IndexedDB and in-memory adapters;
  - `recordDownload` (upsert on download, takes the pending snapshot);
  - opening saved files;
  - the viewer component.
- **Panel:**
  - `ResultView` downloads first, then saves, then shows a one-line status;
  - the repository is passed from `main.tsx` through `App` and `GenerateView`;
  - new unlisted page `history-page.html`.

### Completed Work

- [x] `extension/src/features/history/history-entry.ts` - Entry schema (version 1): ad identity and details, dates, sent date, snapshot status, file sizes; file kinds; list result
- [x] `extension/src/features/history/history-repository.ts` - Repository and pending-snapshot ports; IndexedDB adapter (own databases for metadata and files, files written first and deleted last, orphan sweep, pending pruning); in-memory adapter
- [x] `extension/src/features/history/record-download.ts` - Saves or replaces the entry on download, keeps created and sent dates, moves the pending snapshot in, keeps an older snapshot when the new capture has none
- [x] `extension/src/features/history/open-saved.ts` - Open the saved PDF (blob URL, released after 60 s) or the saved page (viewer URL)
- [x] `extension/src/features/history/SavedPage.tsx` - Viewer: localized banner, snapshot in a sandboxed frame (no scripts, unique origin), ad-text fallback, "deleted" note
- [x] `extension/src/entrypoints/history-page/index.html`, `main.tsx` - The viewer page
- [x] `extension/src/features/job-ad/snapshot.ts` - Page cleaning (removed elements and attributes, absolute URLs, link targets, CSP meta), 5 MB limit, never throws
- [x] `extension/src/features/job-ad/messages.ts` - Capture reply gains an optional snapshot (validated; optional for older content scripts)
- [x] `extension/src/entrypoints/job-ad.content.ts` - Attaches the snapshot to a successful capture
- [x] `extension/src/features/tailoring/ad-key-input.ts` - Shared `AdKey` of a captured ad (moved out of `requirements-resolution.ts`)
- [x] `extension/src/features/generation/capture-ad.ts` - Returns the ad and the snapshot
- [x] `extension/src/features/generation/generation-port.ts` - Pending snapshot write (a failure only drops the page copy), ad details in the result
- [x] `extension/src/features/generation/generation-result.ts` - Optional `ad` on the result (absent in a 0.1.x session)
- [x] `extension/src/entrypoints/background.ts` - The port gets the pending-snapshot store
- [x] `extension/src/features/generate/ResultView.tsx`, `GenerateView.tsx` - Save after download, "Saved to history" or a non-blocking warning
- [x] `extension/src/entrypoints/sidepanel/App.tsx`, `main.tsx` - History repository wiring
- [x] `extension/public/_locales/{en,pl}/messages.json` - Save status and viewer texts
- [x] `extension/src/features/generation/capture-ad.test.ts`, `generation-port.test.ts` - Updated to the new capture shape; port tests for pending snapshot, too-large and write failure
- [x] `e2e/harness/fixtures.ts` - Browser language pinned to English (fix for bolt 022, below)

### Key Decisions

- **Snapshot cleaned in the content script, stored from the background.** The service worker has
  no `DOMParser`. Parsing a copy with `DOMParser` is inert, so no page code runs during cleaning.
  The HTML never passes through the port or `storage.session`.
- **Defence in depth for saved pages.** Cleaning removes active content. The viewer renders the
  copy in `<iframe sandbox="allow-popups allow-popups-to-escape-sandbox" srcdoc>`, with no
  `allow-scripts` and no `allow-same-origin`, so anything cleaning misses still can't run or reach
  `chrome.*`.
- **Own IndexedDB databases** (`cv-snap-history`, `cv-snap-history-files`): `idb-keyval` creates
  one store per database, and the existing `cv-snap` database stays untouched.
- **Banner in the viewer, not in the stored HTML** (as planned): it follows the UI language, and
  the stored copy stays page content only.

### Deviations from Plan

- **Bolt 022 fix:** the e2e test failed on this PC because the harness launches Chromium itself,
  so the Playwright config's `locale` never applied, and Chromium followed the system language
  (Polish). The fixture now passes `locale: "en-US"` and `--lang=en-US`. Bolt 022 passed only
  because Chromium happened to start in English then. The committed 022 code fails the same way
  today (checked with the bolt 023 changes stashed).
- **Orphan sweep:** done by `list()` in the background (best effort) instead of "occasionally".

### Dependencies Added

None.

### Developer Notes

- Unit tests for the history repository, `recordDownload`, snapshot cleaning, the viewer and the
  open functions are written in the Test stage. This stage updated only the existing tests that
  the new shapes broke.
- The one-click e2e test passes, and the download now also writes a history entry. The history
  flow is asserted end to end in bolt 027.
