---
stage: implement
bolt: 012-tailored-cv-ui
created: 2026-10-29T15:14:12Z
---

## Implementation Walkthrough: tailored-cv-ui (settings panel, profile export/import)

### Summary

A Settings screen, opened from the header, holds the Claude model, the UI language, allowed sites,
the GDPR clause, the privacy notice and a profile backup. Every change applies at once. The chosen
model is used for every Claude call, and the clause settings drive the preview and the PDF. A
profile can be exported to a JSON file (optionally with the photo) and imported after a
confirmation. Invalid, foreign and newer-version files are refused, and import waits while a
generation runs.

### Structure Overview

- A new `features/settings` feature has pure parsing of stored settings with per-field defaults, a
  Zustand store on `chrome.storage.local`, and a lazy settings view made of sections.
- The backup format lives with the profile feature, next to a repository import and a store
  action.
- The panel shell gains a `settings` view and a header button. The generate flow and the CV upload
  read the model and the clause from the settings store instead of the built-in defaults.

### Completed Work

- [x] `extension/src/features/settings/settings.ts` - the settings shape, defaults, clause modes and limits, tolerant per-field parsing of stored values
- [x] `extension/src/features/settings/store.ts` - settings store: load at panel start, immediate writes, invalid clause values refused
- [x] `extension/src/features/settings/SettingsSection.tsx` - a titled, labelled group of the settings screen
- [x] `extension/src/features/settings/SettingsView.tsx` - the settings screen: model radio group with trade-off notes, language, GDPR clause (mode, PL/EN text, restore defaults), privacy notice, and the sites and backup sections
- [x] `extension/src/features/settings/SitesSection.tsx` - allowed sites: list with Remove (revokes access), kept in step with Chrome; job-board presets; "Add this site" for the active tab, with the click-the-icon hint when the address is hidden; refused or failed adds reported
- [x] `extension/src/features/settings/BackupSection.tsx` - export (photo checkbox, off by default) and import (file choice, per-problem messages, replace confirmation mentioning an unfinished draft, blocked while generating)
- [x] `extension/src/features/profile/backup.ts` - backup file build and parse: envelope with format and `schemaVersion`, newer versions refused before schema checks, strict profile validation, photo signature and size checks, dated file name
- [x] `extension/src/features/profile/profile-repository.ts` - `importActive`: stores a validated, confirmed profile as active and removes the draft
- [x] `extension/src/features/profile/store.ts` - `importProfile`: profile first, then photo replaced or removed; reports the change so the shown CV is cleared
- [x] `extension/src/features/shell/view.ts`, `PanelHeader.tsx` - settings view; the header now shows only the name and Settings (hidden until the notice is acknowledged)
- [x] `extension/src/features/generate/GenerateView.tsx`, `ResultView.tsx`, `GenerationError.tsx` - the clause from settings drives the preview and the PDF; `MODEL_UNAVAILABLE` offers "Choose another model" (opens settings) and Try again
- [x] `extension/src/entrypoints/sidepanel/App.tsx`, `main.tsx` - settings store (loaded before the panel is ready), model passed per run to generation and to CV upload, lazy settings view, allowed-sites store and download injected
- [x] `extension/src/lib/storage/local-store.ts` - storage keys `settings.model` and `settings.gdprClause`
- [x] `extension/public/_locales/{en,pl}/messages.json` - 56 new keys in each; `fix_MODEL_UNAVAILABLE` points to settings; the unused `privacy_link` removed
- [x] Tests updated for the changed interfaces (view, App privacy flow via settings, generate and result views); `extension/test/settings-fixtures.ts` adds a fake allowed-sites store

### Key Decisions

- **Model read per run, not per panel**: the generate store asks the settings store for the model
  at each Generate click, so a change applies to the next run without reopening anything. The CV
  upload gets it as a prop.
- **The panel waits for settings before it is ready**: nothing can call Claude with the default
  model while a different stored model is still being read.
- **Per-field fallback**: a stored value that is missing or no longer valid (e.g. a model removed in
  a later version) falls back to its own default and leaves the other settings intact.
- **The language stays in the i18n provider**: it already persists the override and switches the
  whole panel. Settings only hosts the control, so there is one source of truth.
- **Backups keep `confirmedAt`**: an exported profile was reviewed and confirmed. Importing makes it
  active directly, after the replace confirmation, instead of sending it through the editor again.
- **Newer versions are checked before the schema**: a newer file gets "update cv-snap" instead of a
  misleading "damaged file".
- **Import order**: the profile is stored before the photo changes, so a failed import leaves the
  current profile and photo as they were.

### Deviations from Plan

- The section component's prop is `heading`, not `title`: the repo's lint rule treats `title` as
  user-facing text.
- `MODEL_UNAVAILABLE` shows "Choose another model" and also keeps Try again (for a plan change made
  outside cv-snap).

### Dependencies Added

None.

### Developer Notes

- Build: main side panel chunk 261 kB, shared chunk 40 kB, settings chunk 12 kB (lazy). The result
  view stays at 1.22 MB (lazy).
- New storage keys: `settings.model` and `settings.gdprClause` in `chrome.storage.local`. The UI
  language stays under `settings.uiLanguage` (bolt 010).
- The dev hook's allowed-sites handle (bolt 007) is still available in dev builds. Settings is now
  the product UI for the same store.
