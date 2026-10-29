---
stage: plan
bolt: 012-tailored-cv-ui
created: 2026-10-29T14:57:35Z
---

## Implementation Plan: tailored-cv-ui (settings panel, profile export/import)

### Objective

One Settings screen in the side panel for the Claude model, UI language, allowed sites, the GDPR
(RODO) clause and the privacy notice, all applied immediately. Plus a profile backup to a JSON
file, and restore from one, with checks.

### Deliverables

**Settings storage (story 008)**
- `features/settings/settings.ts` (pure):
  - the `Settings` type: `model`, `gdprClause` (mode, PL text, EN text);
  - defaults: `DEFAULT_MODEL`, bolt 009's `DEFAULT_GDPR_CLAUSE_SETTINGS`;
  - zod schemas, so an unreadable stored value falls back to its default per field.
- `features/settings/store.ts`: Zustand store over `chrome.storage.local`. It loads at panel
  start, writes each change at once, and exposes `model()` and `gdprClause()` for the other
  features.
- The UI language stays in bolt 010's i18n provider (it already persists it). The settings screen
  just hosts its control.

**Settings view (story 008)**
- `features/settings/SettingsView.tsx`: sections in one column, each a labelled group, with a
  Back button to the previous view.
  - **Model**: radio group for Sonnet 5.5 (default), Opus 5.5 and Haiku 5.5, each with a one-line
    trade-off note (balanced / most capable, slower and uses more of the plan / fastest and
    lightest).
  - **Language**: Automatic / English / Polish. It moves here from the header and switches at
    once.
  - **Allowed sites**: the list with Remove. Remove also revokes the Chrome permission and stays
    in step with removals made in `chrome://extensions` (bolt 007's `subscribe`). Below it, the
    presets not yet added, as "Add" buttons, and "Add this site" for the active tab. It uses the
    page state from bolt 011, so the same click-the-icon hint applies when Chrome hides the
    address. Denied and failed adds show a status message.
  - **GDPR clause**: mode (Polish ads only / Always / Never), PL and EN text areas, and "Restore
    default text". A blank text means no clause, as bolt 009 already does.
  - **Privacy**: "Show the privacy notice" opens the existing notice view (bolt 010).
  - **Profile backup**: export and import (below).
- `features/shell/view.ts`: a `settings` view, opened from a Settings button in the header. The
  header keeps the app name and that button; the language select and the Privacy link move into
  settings.

**Using the settings**
- Every Claude call uses the chosen model. The generate store's `model` dependency (bolt 011) and
  CV upload/profile creation both read it from the settings store, not `DEFAULT_MODEL`.
- The result view takes the clause settings from the settings store instead of the default, so the
  preview and the PDF follow them. A change while a CV is shown re-renders it.
- `MODEL_UNAVAILABLE`: the fix text points to Settings → Model, and the error offers "Open
  settings" (story 008 edge case).

**Profile export/import (story 009)**
- `features/profile/backup.ts` (pure):
  - `buildBackup(profile, photo | null)` produces the file content:
    `{ format: "cv-snap-profile", schemaVersion, exportedAt, profile, photo?: { type, base64 } }`.
  - `parseBackup(text)` returns the profile and photo, or a reason: `NOT_JSON`, `NOT_A_BACKUP`,
    `NEWER_VERSION` (a `schemaVersion` above this build's, checked before the schema), `INVALID`
    (fails `CvProfileSchema`), or `BAD_PHOTO` (not JPG/PNG, or over 2 MB, via bolt 010's photo
    check).
- Export: a checkbox "Include photo" (off by default) and the file name
  `cv-snap-profile-YYYY-MM-DD.json`, downloaded with the existing blob download.
- Import:
  1. Choose a `.json` file (at most 5 MB). An invalid file is rejected with a message per reason.
  2. Confirm "Replace your profile?". The dialog also mentions an unfinished draft, which it
     discards.
  3. The imported profile becomes active, its photo replaces the stored one (or the photo is
     removed), and the shown CV is cleared through `onActiveChanged` (bolt 011).
  - Import is disabled while a generation runs, with a note (story 009 edge case).
- `ChromeStorageProfileRepository.importActive(profile)`: stores a validated, already-confirmed
  profile as active (keeping `confirmedAt`, with `updatedAt` set now) and removes the draft. The
  profile store gets a matching `importProfile` action.

**i18n**: about 45 new PL/EN keys, keeping parity and Chrome's key-name rule (bolt 011 test).

### Dependencies

- `createAllowedSites` and presets (bolt 007); page state and the generate store (bolt 011).
- `GdprClauseSettings`, `selectClause` and the defaults (bolt 009).
- The profile store and repository, photo validation, i18n provider and privacy notice (bolt 010).
- `MODEL_IDS` / `DEFAULT_MODEL` and `CvProfileSchema` / `CV_PROFILE_SCHEMA_VERSION` (shared).
- No new npm dependencies.

### Technical Approach

- Settings are read once at panel start, before the first generation can start, and kept in a
  Zustand store. Changes are written to `chrome.storage.local` immediately. Nothing about
  settings crosses native messaging except the model ID per request, as today.
- The background worker takes the model from each generate request (bolt 011 message), so no
  setting is read there.
- The settings screen is a lazy chunk, like the editor, so panel startup is unaffected.
- Tests:
  - settings store: defaults, invalid stored values, persistence;
  - backup: round trip with and without a photo, each rejection reason;
  - repository and store import;
  - components: settings sections, the model actually used by generation and upload, the clause
    used by the preview, the export file, the import confirm/reject/blocked paths;
  - App: open and leave settings.

### Acceptance Criteria

- [ ] Model: Sonnet 5.5 (default), Opus 5.5 or Haiku 5.5, each with a trade-off note; the choice is used for every Claude call (profile creation and generation)
- [ ] Allowed sites: add presets, add the current site, remove sites (permission revoked)
- [ ] GDPR clause: PL and EN text and the mode can be edited; the preview and the PDF use them
- [ ] UI language change switches the panel immediately
- [ ] The privacy notice can be opened from settings
- [ ] Model unavailable: the generation error points to the model setting
- [ ] Export: a JSON file with `schemaVersion`; the photo only if chosen
- [ ] Import of a valid file: asked before replacing; it becomes the active profile
- [ ] Import of an invalid or newer-version file: rejected with a message
- [ ] Import blocked while a generation runs
- [ ] No hard-coded UI strings; PL/EN parity; panel startup unaffected
