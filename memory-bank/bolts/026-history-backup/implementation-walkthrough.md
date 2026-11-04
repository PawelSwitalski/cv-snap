---
stage: implement
bolt: 026-history-backup
created: 2026-11-04T10:30:00Z
---

## Implementation Walkthrough: 003-history-backup

### Summary

The backup file can now carry the history: every entry's metadata, its PDF (as base64), page
snapshot and ad text. Importing such a file checks everything first, then merges the history entry
by entry, replaces the profile, and applies the retention setting. A profile-only export is still
exactly the 0.1.x file, and 0.1.x files still import.

### Structure Overview

The file format stays in the profile feature's backup module and gains an optional history part.
The decision of what to do with each imported entry is a pure function in the history feature; the
history store applies it through the repository. Settings → Backup wires both together and adds the
"Include history" option, the large-export confirmation and the history line in the import
confirmation.

### Completed Work

- [x] `extension/src/features/profile/backup.ts` - backup file built entry by entry from `Blob` parts; size estimate; import validates the envelope, both schema versions, the profile, the photo and every history entry and file before returning anything
- [x] `extension/src/features/history/merge-import.ts` - per-entry merge decision (add, replace, update metadata, keep) and the change count shown before import
- [x] `extension/src/features/history/store.ts` - reads an entry's files for the export; imports validated entries one by one and reloads the list
- [x] `extension/src/features/history/history-entry.ts` - 10 MB PDF limit for imported entries; type for an entry with its files
- [x] `extension/src/features/settings/BackupSection.tsx` - "Include history" option, confirmation above 50 MB, history count in the import confirmation, import order (history, profile, retention), result line with the count
- [x] `extension/src/entrypoints/sidepanel/App.tsx` - passes the history store and settings to the backup section
- [x] `extension/src/lib/file-checks.ts` - base64 decoding without the per-character callback (PDFs up to 10 MB)
- [x] `extension/src/lib/format-size.ts` - MB formatting moved out of the History section, now shared with the backup dialog
- [x] `extension/public/_locales/{en,pl}/messages.json` - "Backup" wording, 256 MB limit, damaged-history error, history option, large-export dialog, history count lines
- [x] `docs/privacy/index.md`, `docs/privacy/pl.md` - one paragraph: the exported backup holds the profile and, if chosen, the photo and the history, and is never sent anywhere

### Key Decisions

- **The file is built from parts, not one string**: each entry is stringified on its own, so the export never holds the whole history as a single JS string.
- **Newer history schema is refused before the profile is read**: the same order as the existing profile version check, so a newer file always says "newer version", never "damaged".
- **Sizes in imported metadata are recalculated** from the decoded files; the snapshot status must match whether the file has a snapshot.
- **Duplicate ads in one file make the history invalid** instead of picking one silently.
- **An "update" (local CV wins, but the backup brings an earlier created date or a sent date)** rewrites the local files unchanged together with the new metadata, so the repository needs no new method.
- **Retention runs only when the file had history**: a 0.1.x file leaves the history untouched, as the story asks.
- **Count messages avoid plurals** ("…: 3") so EN and PL read correctly for any number.

### Deviations from Plan

- **Story 001, third acceptance criterion** ("0.1.x refuses the new format as newer") is replaced by the approved plan's behaviour: the format name stays `cv-snap-profile`, so 0.1.x imports a backup with history of at most 5 MB as profile only and refuses larger ones as too large. 0.1.x can't be changed to say "newer version" either way.
- The privacy policy keeps **version 2**: the new paragraph describes a file the user saves themselves and changes nothing about what is stored or sent, so the in-app notice isn't shown again.
- Three existing test assertions were updated to the new file name and the `history` field of the parse result; the new tests come in Stage 3.

### Dependencies Added

None.

### Developer Notes

- A history entry whose PDF or ad text is missing in storage is left out of the export (logged without content); the repository writes files before metadata, so this only follows an interrupted write.
- Import reads the whole file as text; the 256 MB limit keeps that well below the V8 string limit. If real users hit the limit, a streamed or ZIP format is the next step (deferred by the user on 2026-11-04).
