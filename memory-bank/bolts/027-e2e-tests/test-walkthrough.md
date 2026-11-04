---
stage: test
bolt: 027-e2e-tests
created: 2026-11-04T11:55:00Z
---

## Test Report: 004-e2e-tests

### Summary

- **E2E**: `pnpm test:e2e` (fresh build of shared, host and the e2e extension) 2/2 passed; the history test passed 4 runs in a row (6 s each)
- **Unit tests**: 1340/1340 passed, 1 skipped (unchanged)
- **Checks**: typecheck (incl. `e2e`), lint (`--max-warnings 0`), `format:check` green
- **Coverage**: not applicable (browser test)

### Test Files

- [x] `e2e/tests/history.spec.ts` - the history flow in five steps against the real panel, host and IndexedDB
- [x] `e2e/tests/one-click.spec.ts` - unchanged; still passes with the marker script in the fixture ad

### Acceptance Criteria Validation

- ✅ **A download is listed; downloading again leaves one entry with a newer date**: step 1 (row in History, one stored entry, later `lastDownloadedAt`)
- ✅ **Mark as sent shows the date and it survives a reload**: step 2 (panel reloaded, "Sent on …" shown, `sentOn` stored)
- ✅ **The saved page shows the fixture ad and the marker script never runs**: step 3 (heading in the sandboxed frame, no `#e2e-script-ran`)
- ✅ **Search and filter leave the right rows**: step 4 (search "inna", Sent, Not sent)
- ✅ **A backdated entry is gone after a reload with Delete after 1 month; Delete removes another**: step 5 (History empty in the panel and in storage)

### Issues Found

- None in the extension. Three test-side fixes during Stage 2 (row name from the site fallback, exact History button name, waiting for the re-download write), recorded in the implementation walkthrough.

### Notes

- The marker check relies on the guard in the fixture script (it runs only off the job board's host); it is not separately proven to fire in a saved copy, since the extension removes and sandboxes scripts by design.
- CI runs the same `pnpm test:e2e` on Ubuntu; this bolt was verified on Windows.
