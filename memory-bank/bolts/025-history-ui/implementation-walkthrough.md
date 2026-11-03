---
stage: implement
bolt: 025-history-ui
created: 2026-11-03T16:59:24Z
---

## Implementation Walkthrough: 002-history-ui (bolt 025)

### Summary

Settings has a History section: keep downloaded CVs forever or delete them N months after the
last download, see how many entries there are and how much space they use, and delete everything.
Old entries are removed when the panel opens and when the period changes; shortening the period
asks first. The privacy notice gains a line about the history and is now version 2, matched by
version 2 of the privacy policy in English and Polish.

### Structure Overview

- **Setting:** a new settings field, read field by field like the others, so 0.1.x settings
  read as "forever".
- **Rules:** pure functions for the cut-off (calendar months, clamped to the month's last day),
  the expired entries, and the usage.
- **History store:** gains `prune` and `clearAll`. The panel prunes once the settings are loaded.
- **Settings view:** the History section sits between Privacy and Backup, and only appears when
  there is a history.

### Completed Work

- [x] `extension/src/features/settings/settings.ts` - `historyRetention` (forever or 1–24 months), schema, default, field-by-field parsing
- [x] `extension/src/features/settings/store.ts` - Loads and saves `historyRetention`; invalid values are ignored
- [x] `extension/src/lib/storage/local-store.ts` - `settings.historyRetention` key
- [x] `extension/src/features/history/retention.ts` - Cut-off date, expired entries (never newer than now), usage (count and bytes)
- [x] `extension/src/features/history/store.ts` - `prune` (reads from storage, deletes with files, returns the count) and `clearAll`
- [x] `extension/src/features/settings/HistorySection.tsx` - Retention radios and month select, usage line, confirmation when entries would be deleted (cancel keeps the setting), Delete all history with confirmation; reloads the history when opened
- [x] `extension/src/features/settings/SettingsView.tsx` - Shows the section when a history exists
- [x] `extension/src/entrypoints/sidepanel/App.tsx` - Prunes once settings are ready; passes the section's dependencies
- [x] `extension/src/features/onboarding/privacy-notice.ts`, `PrivacyNotice.tsx` - Version 2 and the history point
- [x] `extension/public/_locales/{en,pl}/messages.json` - Retention, usage, dialogs and the notice point; English counts worded without plurals ("Entries: 3"), because Chrome i18n has no plural forms
- [x] `docs/privacy/index.md`, `pl.md` - Version 2 (3 November 2026, to be set to the 0.2.0 release date); new summary point; what the history stores and for how long; how to delete it
- [x] `scripts/release-docs.test.mjs` - The new point is part of the word-for-word check
- [x] `store/listing.md` - `storage` / `unlimitedStorage` justifications mention the history; policy version 2; a note to confirm the privacy-practices answers at upload
- [x] `extension/src/features/settings/store.test.ts` - Expectations include the new field, plus retention parsing (written here because the old test broke)

### Key Decisions

- **Calendar months, not 30-day blocks:** "Delete after 3 months" means the same day 3 months
  ago, clamped to the month's last day (31 May − 3 months → 28/29 February).
- **Pruning reads from storage, not from the store's last list.** The panel prunes before the
  History view was ever shown, so the list may not be loaded yet.
- **A change that deletes nothing is saved at once.** Only a change that would delete entries
  asks. The radio stays on the old choice until confirmed.

### Deviations from Plan

- The History section **reloads the history when opened**, so the usage figures can't be stale.
  This came up in the real-browser check, where entries seeded straight into IndexedDB weren't
  counted.
- **Plural-free English wording** (see above).

### Dependencies Added

None.

### Developer Notes

- One-off check in Playwright's Chromium (not committed; bolt 027 makes the retention part
  permanent). Seeded entries were 400, 100 and 5 days old:
  - the notice for an existing user shows the new point;
  - Settings showed "3 entries, 0.9 MB";
  - choosing 12 months asked "1 entries … before November 3, 2025", and Keep left "Forever"
    checked (this check revealed the plural problem);
  - confirming left 2 entries;
  - 3 months stored, then a panel reload, left 1 entry;
  - Delete all left 0.
- Bolt 026 (backup) calls `prune` after an import and adds the backup sentence to the policy.
