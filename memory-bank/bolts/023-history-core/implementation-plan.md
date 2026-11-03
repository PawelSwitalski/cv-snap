---
stage: plan
bolt: 023-history-core
created: 2026-11-03T16:02:09Z
---

## Implementation Plan: 001-history-core (bolt 023)

### Objective

Every downloaded CV is kept on this PC: one history entry per ad (`AdKey`), holding the exact
PDF bytes, the ad's details and text, and a cleaned, inert snapshot of the job-ad page taken when
the ad was captured. Saved PDFs and pages can be opened safely. The History tab UI comes in bolt
024; this bolt delivers the data layer, saving on download, the snapshot, and the viewers.

### Deliverables

1. **History store** (story 001), `extension/src/features/history/`
   - `history-entry.ts`: the zod `HistoryEntrySchema` (`schemaVersion: 1`) and its types.
     - Metadata: `adKey`, `title`, `company`, `url`, `isManualSelection`, `outputLanguage`,
       `fileName`, `createdAt`, `lastDownloadedAt`, `sentOn` (`YYYY-MM-DD` or null; used from
       bolt 024), `snapshot` (`"saved"`, `"too-large"` or `"none"`), and `sizes` (pdf, snapshot,
       ad text: for "space used" in bolt 025).
     - Files: the PDF blob, the snapshot HTML and the ad text.
   - `history-repository.ts`: the `HistoryRepository` port with `list()` (metadata only, newest
     first, unreadable records counted as `unreadable`), `get(adKey)`, `getFile(adKey, kind)`,
     `put(entry, files)`, `delete(adKey)`, and the pending-snapshot calls below. Two adapters:
     - IndexedDB through `idb-keyval`: DB `cv-snap-history` (store `meta`) and DB
       `cv-snap-history-files` (store `files`). Separate databases, because `idb-keyval` creates
       one store per database, and the existing `cv-snap` / `files` stays untouched. Listing
       never loads blobs.
     - In-memory, for tests.
   - Write order: files first, then metadata. Delete order: metadata first, then files. A crash
     can leave at worst an orphan file, never an entry without its PDF. `list()` sweeps orphans
     occasionally.
2. **Snapshot** (story 003)
   - `features/job-ad/snapshot.ts`: `snapshotPage(html, pageUrl)` returns the cleaned HTML or
     null. It runs in the **content script**: the background worker has no `DOMParser`, and
     parsing a copy with `DOMParser` gives an inert document where no page code runs.
     - **Removes:** `script`, `noscript`, `iframe`, `frame(set)`, `object`, `embed`, `applet`,
       `base`, `meta[http-equiv=refresh]`, `link` other than stylesheets and icons, every `on*`
       attribute, `srcdoc`, `action`/`formaction`, and `javascript:`/`data:text/html` URLs.
     - **Makes absolute:** `href`, `src`, `srcset`, `poster`, and CSS `url()` in `style`
       attributes and `<style>`.
     - **Adds:** `target="_blank" rel="noopener noreferrer"` on links, and a CSP meta as the first
       element of `<head>`:
       `default-src * data: blob:; script-src 'none'; object-src 'none'; frame-src 'none'; base-uri 'none'; form-action 'none'`.
   - The capture reply gains `snapshot: string | null` next to the ad. Over 5 MB (UTF-8) after
     cleaning gives `"too-large"`. An error while cleaning gives null, and capture still
     succeeds. The content script's reply schema is extended and validated as before.
   - **Background (`generation-port.ts`):** after capture, it computes the `AdKey` (the same
     helper as the requirements cache, moved into `features/tailoring/ad-key-input.ts`) and
     stores the snapshot as **pending** in IndexedDB under that key. Pending items older than
     24 h, or beyond the newest 10, are pruned on each write. The HTML never goes through the
     port or session storage.
   - The result sent to the panel gains `ad: { adKey, url, text, isManualSelection, snapshot }`,
     where `snapshot` is the status only. It is optional when reading a session saved by 0.1.x.
3. **Save on download** (story 002)
   - `features/history/record-download.ts`: `recordDownload({ result, fileName, pdf, now })`.
     - Upserts by `adKey` and moves the pending snapshot into the entry, if there is one.
     - For an existing entry: keeps `createdAt` and `sentOn`; replaces the PDF and
       `lastDownloadedAt`; keeps the old snapshot if the new capture has none.
   - `ResultView`: `save()` calls `download()` first, then `recordDownload` (not awaited before
     the download). A short status line follows: "Saved to history", or a non-blocking warning
     that it wasn't saved. Without `result.ad` (a session from 0.1.x) nothing is saved and
     nothing is shown.
   - The history store is created once per side panel and passed through `GenerateViewDeps`
     (the same pattern as the other stores).
4. **Open saved files** (story 004)
   - `features/history/open-saved.ts`:
     - `openSavedPdf(adKey)`: a `blob:` URL in a new tab (Chrome's PDF viewer), revoked after
       60 s.
     - `openSavedPage(adKey)`: opens `history-page.html?id=<adKey>`.
   - New unlisted entry point `entrypoints/history-page/` (WXT). It shows a localized banner
     ("Saved by cv-snap on {date} from {URL}") and renders the snapshot in
     `<iframe sandbox="allow-popups allow-popups-to-escape-sandbox" srcdoc=…>`.
     - With no `allow-scripts` and no `allow-same-origin`, page code can't run and can't reach
       `chrome.*`.
     - Without a snapshot (too large or failed), it shows the stored ad text as plain text.
     - For a deleted entry: "This entry was deleted".
   - The buttons that call these arrive in the History tab (bolt 024). This bolt tests them
     directly.
5. **Texts (EN/PL)**: "Saved to history", "Couldn't save this CV to history…", and the viewer's
   banner, "too large" note and "deleted" note.

### Dependencies

- `idb-keyval` (already used). No new packages and no new permissions.
- Requirements cache: the `AdKey` helper is extracted and reused, so the history and the cache
  agree on what "the same ad" is.

### Technical Approach

- **Banner in the viewer, not baked into the snapshot (deviation from story 003's wording):** the
  banner then follows the UI language and the entry's date. The stored HTML stays page content
  only, so it never needs rewriting.
- **Two layers of defence for saved pages:** cleaning, which also makes the copy readable
  offline and smaller, and a sandboxed iframe with no scripts and a unique origin, which holds
  even if cleaning misses something.
- **The snapshot lives in IndexedDB from capture time.** Only its status travels with the result,
  so `storage.session` (10 MB) and the port stay small.

### Acceptance Criteria

- [ ] Saving and reading an entry returns identical metadata and PDF bytes. Upsert by `AdKey`.
  The list is metadata only, newest first. Delete removes metadata and files. Bad records are
  skipped and counted. 500 entries list in < 200 ms (unit test with the memory adapter, plus an
  IndexedDB timing test with `fake-indexeddb`).
- [ ] Download PDF saves the entry with the exact downloaded bytes. A re-download replaces the
  PDF and date and keeps `createdAt` and `sentOn`. A failed save still downloads and shows a
  warning. A successful save shows "Saved to history". A restored session result saves the same
  way.
- [ ] Snapshot: a fixture page with inline, external and handler scripts, `javascript:` links,
  iframes, `object`/`embed`, `<base>` and forms comes out with none of them. URLs are absolute.
  The CSP meta is present. Over 5 MB gives `"too-large"`. It is taken at capture time (tab
  navigation afterwards doesn't matter).
- [ ] Viewer: the snapshot renders in a sandboxed iframe with no `allow-scripts` and no
  `allow-same-origin`. The ad-text fallback works. A deleted entry shows the note. The PDF opens
  from its blob.
- [ ] Typecheck, lint, format and all tests pass. `pnpm test:e2e` stays green (the one-click flow
  now also saves to history; asserting it is bolt 027).
