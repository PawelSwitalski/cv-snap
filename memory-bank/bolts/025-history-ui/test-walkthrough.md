---
stage: test
bolt: 025-history-ui
created: 2026-11-03T17:04:56Z
---

## Test Report: 002-history-ui (bolt 025)

### Summary

- **Tests**: 1303/1304 passed, 1 skipped (unchanged: the shell-launcher test that runs only off Windows); 20 new since bolt 024
- **E2E**: `pnpm test:e2e` 1/1 passed
- **Real-browser check (one-off, Implement stage)**: notice v2 shown to an existing user with the history point; Settings usage; the shorten confirmation (cancel keeps "Forever"); pruning on confirm and on panel reopen; Delete all
- Typecheck, lint, `format:check` green; the privacy-docs test checks the new notice point word for word in both policies

### Test Files

- [x] `extension/src/features/history/retention.test.ts` - Cut-off by calendar months (3, 12, 24), clamped to short months (31 May → 28 Feb, leap year 29 Feb); nothing expires for "forever"; entries before the cut-off expire, sent ones too; an entry dated after now never expires; usage adds up every file
- [x] `extension/src/features/history/store.test.ts` - `prune` deletes expired entries with their files before anything was loaded and returns the count; nothing pruned for "forever"; `clearAll` empties metadata and files (+3)
- [x] `extension/src/features/settings/HistorySection.test.tsx`:
  - "forever" is the default; usage shows "Entries: 3, 1.5 MB"; the month select is off;
  - a shorter period asks with the count and date, cancel keeps the setting, confirm saves and stores it and prunes;
  - changing the month count asks again;
  - a change that deletes nothing saves at once;
  - Delete all only after confirming, then the button is disabled.
- [x] `extension/src/features/settings/store.test.ts` - Retention read back, missing (0.1.x) or invalid → "forever" (Implement stage)
- [x] `extension/src/entrypoints/sidepanel/App.test.tsx` - The panel prunes on open by the stored setting; a user who acknowledged v1 sees the notice with the history point once, and the version becomes 2 (+2)
- [x] `scripts/release-docs.test.mjs` - The new point is quoted in both policies; version 2 in the policies matches `PRIVACY_NOTICE_VERSION`

### Acceptance Criteria Validation

- ✅ **Settings → History**: Keep forever (default) or after N months (1–24); count and space shown
- ✅ **Pruning**: entries last downloaded more than N months ago are deleted with their files when the panel opens, sent or not
- ✅ **Shorter period**: asks first with how many entries go; cancel keeps the old setting
- ✅ **Delete all history**: only after confirming
- ✅ **Older settings**: no field reads as "forever"
- ✅ **Clock moved back**: nothing newer than now is deleted
- ✅ **Privacy v2**: an existing user sees the notice once, then not again; notice and policy (EN/PL) cover the history; version and date match; the docs test passes
- ✅ **Typecheck, lint, format, all tests, `pnpm test:e2e` green**

### Issues Found

None in this stage. The two found while implementing (stale usage in Settings, "1 entries" in English) are fixed and described in the implementation walkthrough.

### Notes

- The policy's effective date (3 November 2026) is to be set to the 0.2.0 release date at release.
- The Chrome Web Store privacy-practices answers are to be confirmed at the 0.2.0 upload (noted in `store/listing.md`).
