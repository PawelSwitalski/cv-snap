---
stage: test
bolt: 028-own-cv-save
created: 2026-11-04T17:40:00Z
---

## Test Report: 001-own-cv-save

### Summary

- **Unit tests**: 1370/1370 passed, 1 skipped (was 1340; 30 new)
- **E2E**: `pnpm test:e2e` (fresh build) 2/2 passed; the content script change doesn't affect the one-click or history flows
- **Checks**: typecheck, lint (`--max-warnings 0`), `format:check` green
- **Coverage**: every acceptance criterion of stories 001–003 has a test (below)

### Test Files

- [x] `extension/src/features/history/record-own-cv.test.ts` - defaults from JSON-LD / page title, stored CV name, exact bytes + ad + snapshot, trimmed fields, replacing a tailored entry with kept dates and snapshot, no write for an invalid entry, 10 MB timing
- [x] `extension/src/features/history/capture-own-cv-ad.test.ts` - ad, key, snapshot and page title; older content script; capture failures
- [x] `extension/src/features/history/SaveOwnCv.test.tsx` - stored CV with edited fields, picked PDF, invalid file, replace confirm (Keep / Replace), own over own without asking, capture problem, failed save, hidden where Generate can't capture
- [x] `extension/src/features/generate/GenerateView.own-cv.test.tsx` - tailored download over an own CV asks (Keep / Replace); buttons under Generate
- [x] `extension/src/entrypoints/sidepanel/App.test.tsx` - own CV saved from the panel with no host request and no generation connection
- [x] `extension/src/features/history/HistoryHint.test.tsx`, `HistoryView.test.tsx`, `record-download.test.ts`, `features/profile/backup.test.ts` - own-CV hint texts, row labels (incl. 0.2.0 entries as Tailored), Download PDF writes "tailored", source kept through a backup, unknown source refused

### Acceptance Criteria Validation

- ✅ **Download PDF saves "tailored", own CV "own", 0.2.0 entries read as Tailored**: record-download, record-own-cv, HistoryView
- ✅ **History row and hint show the source**: HistoryView, HistoryHint
- ✅ **Source survives a backup round trip**: backup.test; 0.2.0 compatibility follows from the optional field (0.2.0's schema drops unknown fields)
- ✅ **Stored CV saved with exact bytes, ad text, snapshot, no host call**: record-own-cv, SaveOwnCv, App
- ✅ **Picked PDF validated like an upload; stored CV unchanged**: SaveOwnCv (the picked file goes only to the entry)
- ✅ **Re-saving keeps one entry with created and sent dates**: record-own-cv
- ✅ **Title/company prefilled, editable, saved as typed**: record-own-cv, SaveOwnCv
- ✅ **Replacing the other kind asks first, both directions**: SaveOwnCv, GenerateView.own-cv
- ✅ **Failure leaves nothing and shows an error**: record-own-cv, SaveOwnCv
- ✅ **Saved to history + Show in history**: SaveOwnCv
- ✅ **10 MB in under 1 s**: record-own-cv (memory repository; the IndexedDB write is checked by hand in the release verify)

### Issues Found

- One existing HistoryView test needed the date text in its own element after the source label was added (fixed in Stage 2).

### Notes

- The 0.2.0 compatibility of a backup with `source` is reasoned from the code (zod object strips unknown keys), not run against a 0.2.0 build.
- The no-helper path end to end (no host registered at all) is covered by the E2E test in bolt 030.
