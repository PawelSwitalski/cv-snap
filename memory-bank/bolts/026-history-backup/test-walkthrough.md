---
stage: test
bolt: 026-history-backup
created: 2026-11-04T10:45:00Z
---

## Test Report: 003-history-backup

### Summary

- **Tests**: 1340/1340 passed, 1 skipped (as before: the real shell-launcher test on Windows); 37 new, 3 updated
- **E2E**: `pnpm test:e2e` 1/1 passed
- **Checks**: typecheck, lint (`--max-warnings 0`), `format:check` green
- **Coverage**: not measured; every new branch of the backup format, merge and Settings flow has a test

### Test Files

- [x] `extension/src/features/profile/backup.test.ts` - round trip with identical PDF bytes (all 256 byte values), snapshot (Polish text) and ad text; own history schema version; profile-only export is the 0.1.x file byte for byte; empty history; an entry with missing files is left out; sizes recalculated; size estimate; newer history version refused before the entries; damaged metadata, non-PDF, non-base64, missing or oversized PDF, oversized snapshot, snapshot/status mismatch both ways, malformed history part and duplicate ads all refused as `BAD_HISTORY`; the size limit is checked without reading the file
- [x] `extension/src/features/history/merge-import.test.ts` - add, replace (later download wins, earlier created date kept), keep on equal or older date, sent date taken from either side, first sent date when both have one, earlier created date brought to a kept entry; change count
- [x] `extension/src/features/history/store.test.ts` - reading an entry's files for export (null when the PDF is gone); import adds, replaces files, updates metadata with the local files left as they are, keeps; a failure halfway leaves the list showing what was written
- [x] `extension/src/features/settings/BackupSection.test.tsx` - history exported by default and left out when unticked; option disabled for an empty history; above 50 MB the size is shown, cancel downloads nothing, confirm exports; no dialog when history isn't included; import confirmation shows the change count, then history merged, profile active, retention applied; a 0.1.x file imports with the history untouched (retention not run); a damaged history writes nothing
- [x] `extension/src/features/settings/SettingsView.test.tsx` - export file name updated to `cv-snap-backup-…`

### Acceptance Criteria Validation

- ✅ **Export with history, imported on a clean profile, restores profile and every entry with identical bytes and metadata**: `backup.test.ts` round trip; `BackupSection.test.tsx` import flow
- ✅ **Merge: later download wins, sent date kept if either side has one, new ads added, local-only entries stay**: `merge-import.test.ts`, `store.test.ts`, `BackupSection.test.tsx`
- ✅ **A 0.1.x JSON backup still imports, profile only, history untouched**: `BackupSection.test.tsx`; the existing 0.1.x parse tests still pass
- ✅ **Without "Include history" the export is the 0.1.x format**: `backup.test.ts` (byte for byte), `BackupSection.test.tsx`
- ✅ **Corrupt or oversized history parts, a bad PDF, a newer version: nothing written, clear error**: `backup.test.ts` (each case), `BackupSection.test.tsx` (nothing written, `backup_error_bad_history` shown)
- ✅ **Over 50 MB the estimated size is shown and confirmed before export**: `BackupSection.test.tsx`
- ✅ **After import the retention setting is applied**: `BackupSection.test.tsx` (an expired imported entry is removed)
- ✅ **Typecheck, lint, format, all tests and `pnpm test:e2e` pass**

### Issues Found

- None in the implementation. The old "file over 5 MB" test would have allocated 256 MB with the new limit; it now fakes the size and fails if the file is read, which also proves the limit is checked first.

### Notes

- Story 001's third criterion (0.1.x refuses the new file as newer) is covered by the approved replacement behaviour, see the implementation walkthrough; 0.1.x itself isn't tested here.
- Not tested in a real browser: exporting and importing a large real history (tens of MB). Worth one manual check before release 0.2.0.
