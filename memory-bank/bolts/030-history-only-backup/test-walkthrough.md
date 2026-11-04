---
stage: test
bolt: 030-history-only-backup
created: 2026-11-04T20:15:00Z
---

## Test Report: 002-history-only-mode (bolt 030)

### Summary

- **Unit tests**: 1412/1412 passed, 1 skipped (was 1404; 8 new)
- **E2E**: `pnpm test:e2e` (fresh build) 3/3 passed, including the new history-only test with no host registered
- **Checks**: typecheck, lint (`--max-warnings 0`), `format:check` green

### Test Files

- [x] `extension/src/features/profile/backup.test.ts` - profile-less round trip; refused with neither profile nor history (absent or empty); build refuses the same
- [x] `extension/src/features/settings/BackupSection.test.tsx` - export without a profile (history only, no photo option, note); export disabled with nothing to export; history-only import on a clean panel (confirm text, merge, callback, no profile); profile-less file merged next to a profile (profile unchanged, no callback)
- [x] `extension/src/entrypoints/sidepanel/App.test.tsx` - import a history-only backup on a clean panel → history-only home, flag on, entry kept as "Your CV"
- [x] `e2e/tests/history-only.spec.ts` - no host, no profile: setup fails → Use without the helper → CV stored → Save my CV (title and company from JSON-LD) → stored entry with source "own" → "Your CV" row in History; 0 native messaging calls after the setup check (counter verified to be installed)

### Acceptance Criteria Validation

- ✅ **Export in history-only mode: history, sources kept, no profile**: BackupSection
- ✅ **That file on a clean browser: same entries and PDFs, history-only mode**: backup round trip, BackupSection, App
- ✅ **A backup with a profile imported in history-only mode creates the profile and ends the mode**: existing import tests plus bolt 029's "profile clears the flag" panel test
- ✅ **A profile-less backup next to a profile merges only the history**: BackupSection
- ✅ **0.1.x and 0.2.0 backups import unchanged**: existing backup and BackupSection tests, unchanged and green
- ✅ **Privacy texts mention own CVs and history-only mode; notice stays at version 2**: notice string and policy updated; the App test that shows notice v2 still passes
- ✅ **E2E: no host → use without helper → save own CV → Your CV; no host connection after the check**: history-only.spec
- ✅ **`pnpm test:e2e` runs it**: 3/3 locally; CI runs the same command

### Issues Found

- **Envelope schema required `profile`** (`z.unknown()` is not optional in zod 4): a history-only backup was refused as "not a backup". Fixed with `.optional()`; found by the new backup test.
- **Wrong message after a history-only import** ("Profile imported… now your active profile"): new message "History imported. Entries added or updated: N."; found by the new panel test.
- From Stage 2's E2E run: history-only home's title, and the harness race on content-script registration (both fixed then).

### Notes

- CI hasn't run the new E2E test yet; it runs on the next push.
- The policy's summary list and the in-app notice are kept in sync by hand (no test ties them together).
