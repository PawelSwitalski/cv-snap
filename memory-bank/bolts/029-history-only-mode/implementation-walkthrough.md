---
stage: implement
bolt: 029-history-only-mode
created: 2026-11-04T18:30:00Z
---

## Implementation Walkthrough: 002-history-only-mode (bolt 029)

### Summary

cv-snap now works without the helper. A failing setup check offers "Use without the helper"; the
user adds a CV PDF (stored only) and lands on a history-only home that saves their CV for each ad.
"Set up the helper" later runs the check and creates the profile from the stored CV, and the mode
switches off once a profile exists. Settings shows "Your CV" with Replace… in this mode.

### Structure Overview

The mode is a stored flag plus a step in the panel's state, both fed into the pure `deriveView`.
A draft or a profile always wins over the flag. The new screens reuse what exists: SaveOwnCv
(bolt 028), the setup check, the CV upload and the Add this site button.

### Completed Work

- [x] `extension/src/lib/storage/local-store.ts` - `STORAGE_KEYS.historyOnly`
- [x] `extension/src/features/shell/history-only.ts` - read and write the flag (only `true` counts)
- [x] `extension/src/features/shell/view.ts` - views `history-upload`, `history-home`, `helper-setup`, `helper-upload`; inputs `isHistoryOnly`, `historyOnlyStep`
- [x] `extension/src/features/onboarding/SetupCheck.tsx` - optional Use without the helper (only when blocked) and Back
- [x] `extension/src/features/cv-upload/StoreCvOnly.tsx` - upload that stores the PDF only; `storeCvFile` shared with Settings
- [x] `extension/src/features/cv-upload/CvUpload.tsx` - optional stored file: Create my profile from my CV
- [x] `extension/src/features/shell/HistoryOnlyHome.tsx` - page-aware home: SaveOwnCv, Add this site, page notes, the hint, and the "Tailoring needs the helper" card
- [x] `extension/src/features/generate/GenerateButton.tsx` - `AddSiteButton` and `pageNoteKey` extracted for reuse; behaviour unchanged
- [x] `extension/src/features/settings/YourCvSection.tsx`, `SettingsView.tsx` - Your CV with Replace…, in history-only mode only
- [x] `extension/src/entrypoints/sidepanel/App.tsx` - flag loading, the new views, clearing the flag once a profile exists
- [x] `extension/public/_locales/{en,pl}/messages.json` - 18 new strings

### Key Decisions

- **The flag is written after the CV is stored**, not when "Use without the helper" is clicked, so going Back leaves the user where they were.
- **A profile clears the flag** whenever it appears (helper later, or a backup import), so the mode can't outlive it.
- **"Use without the helper" is offered only when the panel has a history** (previews and tests without one don't show it).
- **Create my profile from my CV goes through the normal upload**: it shows the same progress, cancel and errors, and choosing another file still works.

### Deviations from Plan

- None.

### Dependencies Added

None.

### Developer Notes

- The setup check is the only host contact on the history-only path; the panel's host client is lazy, so no port opens otherwise. A test for this comes in stage 3.
- Backup in this mode still says "no profile yet" until bolt 030.
