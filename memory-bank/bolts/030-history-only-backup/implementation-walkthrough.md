---
stage: implement
bolt: 030-history-only-backup
created: 2026-11-04T19:50:00Z
---

## Implementation Walkthrough: 002-history-only-mode (bolt 030)

### Summary

Backups work without a profile: in history-only mode the export holds the history alone. Importing
such a file on a clean browser turns history-only mode on; next to a profile it merges only the
history. The privacy notice point and the policy now cover own CVs and history-only mode. A new
browser test runs the whole no-helper path with no host registered.

### Structure Overview

The backup envelope is unchanged except that `profile` may be absent when history is present. The
Settings backup section decides from the panel state (profile or not) and the parsed file (profile
or not) what to export, what to confirm and what to import. The E2E harness gained an option for
what a test starts with.

### Completed Work

- [x] `extension/src/features/profile/backup.ts` - build and parse a backup without a profile (history required); photo ignored without a profile
- [x] `extension/src/features/settings/BackupSection.tsx` - export without a profile (history forced on, no photo option, a note); history-only import confirm; `onHistoryOnlyImported`
- [x] `extension/src/entrypoints/sidepanel/App.tsx` - the import callback sets history-only mode
- [x] `extension/src/features/shell/HistoryOnlyHome.tsx` - its own title, "Your applications" (found by the E2E: it showed "Your profile is ready")
- [x] `extension/public/_locales/{en,pl}/messages.json` - 4 new strings; the notice's history point says "download or save"
- [x] `docs/privacy/index.md`, `pl.md` - own CVs in History, a "Using cv-snap without the helper" section, profile-less backups; version stays 2, "text updated 4 November 2026"
- [x] `e2e/harness/fixtures.ts` - `cvSnapSetup` option (`host`, `profile`); waits for the job-ad content script to be registered before a test starts
- [x] `e2e/tests/history-only.spec.ts` - the no-helper path in five steps, counting native messaging calls after the setup check

### Key Decisions

- As approved: no `profile` field means a history-only backup; the stored CV is not in the backup; the notice stays at version 2.
- **The harness waits for the content-script registration.** Without a profile to seed, the test opened the ad before the extension had registered its script, so the page had none. Seeding a profile had been hiding this race. A real user only hits it with a tab opened before installing, which needs a reload anyway.
- **The native-call counter checks that it really replaced the functions**, so a count of 0 can't come from a patch that silently failed.

### Deviations from Plan

- The history-only home title fix and the harness wait were not planned; both came from the first E2E run.

### Dependencies Added

None.

### Developer Notes

- The counter patches `chrome.runtime`; the extension calls `browser.runtime`, which in Chrome MV3 builds is the same object (WXT).
- 0.2.0 refuses a profile-less backup as invalid; the release notes must say so.
