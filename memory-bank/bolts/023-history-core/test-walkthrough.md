---
stage: test
bolt: 023-history-core
created: 2026-11-03T16:25:37Z
---

## Test Report: 001-history-core (bolt 023)

### Summary

- **Tests**: 1230/1231 passed, 1 skipped (unchanged: the shell-launcher test that runs only off Windows); 50 new since bolt 022
- **E2E**: `pnpm test:e2e` 1/1 passed (the download now also writes a history entry)
- **Real-browser check (one-off, not committed)**: after the one-click flow in Playwright's Chromium, IndexedDB had the entry (`snapshot: "saved"`, correct ad key, title, URL, file name, dates). `history-page.html` showed the localized banner and the page inside the sandboxed frame (the heading was visible), and the stored copy contained no `<script>` and did contain the CSP. This is asserted permanently in bolt 027.
- Typecheck, lint, `format:check` and `zip:release` green

### Test Files

- [x] `extension/src/features/history/history-repository.test.ts` - The same contract on the memory and IndexedDB adapters:
  - round trip with identical bytes, upsert by `AdKey`, snapshot kept, replaced or removed;
  - list is metadata only and newest first; delete removes everything;
  - an invalid entry is refused without writing its files; pending snapshots are handed over once;
  - unreadable records are skipped and counted; 500 entries list in < 200 ms;
  - pending pruning by age and count.
- [x] `extension/src/features/history/record-download.test.ts` - Create with the exact bytes, details and pending snapshot; re-download keeps created and sent dates; a newer capture replaces the snapshot; too-large/none keep the ad text only; manual selection; 0.1.x session skipped
- [x] `extension/src/features/job-ad/snapshot.test.ts` - Hostile fixture page:
  - scripts, `noscript`, frames, `object`/`embed`, `<base>`, refresh and page CSP metas removed;
  - handlers, `srcdoc` and form actions removed; `javascript:`, obfuscated and HTML `data:` URLs dropped;
  - SVG script removed; only stylesheet links kept;
  - absolute URLs (href, src, srcset, style, `<style>`); links open in new tabs; ad text kept; own CSP first;
  - 5 MB limit counted in bytes.
- [x] `extension/src/features/history/SavedPage.test.tsx` - Sandboxed frame (no `allow-scripts`, no `allow-same-origin`) with the snapshot, localized banner, ad-text fallback for too-large and none, banner without an address, deleted entry
- [x] `extension/src/features/history/open-saved.test.ts` - PDF opened from its blob, URL released after 60 s, nothing for a deleted entry, viewer URL encoded
- [x] `extension/src/features/generate/ResultView.test.tsx` - Download first, then the same PDF saved, "Saved to history"; failed save still downloads with a note; skipped save says nothing (+3)
- [x] `extension/src/features/job-ad/messages.test.ts` - Capture reply: saved, too-large, none or missing snapshot accepted; over-limit or HTML-less rejected (+2)
- [x] `extension/src/features/generation/generation-port.test.ts`, `capture-ad.test.ts` - Pending snapshot under the ad's key with only its status in the result; too-large passed on; write failure → none, result still sent; capture returns ad + snapshot (written in the Implement stage)

### Acceptance Criteria Validation

- ✅ **Store**: identical metadata and PDF bytes, upsert by `AdKey`, metadata-only list newest first, delete removes all files, bad records skipped and counted, 500 entries < 200 ms (IndexedDB via `fake-indexeddb`)
- ✅ **Save on download**: exact downloaded bytes; re-download replaces PDF and date and keeps `createdAt`/`sentOn`; failed save still downloads with a warning; "Saved to history" on success; a restored session result with ad details saves the same way (the session schema keeps `ad`); a 0.1.x session is skipped
- ✅ **Snapshot**: all listed active content removed, URLs absolute, CSP present, > 5 MB → `"too-large"`; taken during capture (the content script attaches it to the capture reply; the real-browser check saw it after generation)
- ✅ **Viewer**: sandboxed frame without `allow-scripts`/`allow-same-origin`, ad-text fallback, deleted note, PDF opened from its blob
- ✅ **Typecheck, lint, format, all tests, `pnpm test:e2e` green**

### Issues Found

- **Fixed:** `put` validated the entry only after writing the files (IndexedDB adapter), so an invalid entry would have left orphan files. The memory adapter threw synchronously instead of rejecting. Both now validate first; a test covers it.
- **Test-environment quirks (not product issues):** happy-dom's `querySelectorAll("a")` skips SVG links, and its parser nests elements after an SVG `<script>` inside it. The tests check the SVG link separately and place it before the script.

### Notes

- The JSON-LD `<script type="application/ld+json">` is removed from snapshots too. It isn't shown by a page anyway, and the parsed ad fields are already in the entry.
- The History tab, which lists and opens entries, is bolt 024.
