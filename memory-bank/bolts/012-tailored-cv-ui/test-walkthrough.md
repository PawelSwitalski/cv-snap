---
stage: test
bolt: 012-tailored-cv-ui
created: 2026-10-29T15:24:22Z
---

## Test Report: tailored-cv-ui (settings panel, profile export/import)

### Summary

- **Tests**: 922/922 passed across the repo (`pnpm test`). The extension has 503, of which 44 were
  added in this stage, in 4 new files and 6 extended ones.
- **Coverage** (bolt 012 code): 93.5% lines, 92.9% statements, 77.6% branches. Not covered are
  mainly the export/import failure paths (storage errors) and refresh fallbacks after a missed
  Chrome event.
- **Typecheck, lint, Prettier**: clean. The production build passes.
- **Manual Chrome check**: passed (user, 2026-10-29)

### Test Files

- [x] `extension/test/settings-fixtures.ts` - in-memory allowed-sites store with the real store's interface (grant or deny, call log, change events)
- [x] `extension/src/features/settings/store.test.ts` - defaults (Sonnet 5.5); per-field fallback for unknown models or clauses; load and immediate writes; reopen keeps the choice; over-long clause refused; storage failure doesn't break the panel
- [x] `extension/src/features/profile/backup.test.ts` - round trip without and with the photo (same bytes); no photo claimed when none is exported; dated file name; newer version refused before the schema check; rejects not-JSON, foreign JSON, a bare profile, damaged or unconfirmed profiles, non-image or non-base64 photos, and files over 5 MB
- [x] `extension/src/features/settings/SettingsView.test.tsx` - model radios with trade-off notes, choice stored; language switches the panel at once; clause mode and text edits, restore defaults; privacy and back; sites listed, removed (access revoked), added presets hidden, preset and current-site adds, refused access, hidden-address hint; export without and with the photo; no export without a profile; import confirm → active; decline keeps the profile; invalid and newer-version files rejected; import blocked while generating
- [x] `extension/src/features/generate/GenerationError.test.tsx` - `MODEL_UNAVAILABLE` points to settings (fix text, "Choose another model", Try again); one action per error kind
- [x] `extension/src/features/profile/profile-repository.test.ts` (extended) - import keeps the profile ID and `confirmedAt`, sets `updatedAt`, removes the draft
- [x] `extension/src/features/profile/store.test.ts` (extended) - import with a photo replaces the stored photo and the draft and reports the change; import without a photo removes the stored one
- [x] `extension/src/entrypoints/sidepanel/App.test.tsx` (extended) - privacy notice from settings and back; Generate sends the model chosen in settings; CV upload creates the profile with the chosen model; the clause from settings is printed in the preview
- [x] `extension/src/features/shell/view.test.ts` (extended) - settings over home and the editor; the notice over settings; never settings before the notice is acknowledged
- [x] `extension/src/features/generate/GenerateView.test.tsx`, `ResultView.test.tsx` (updated) - settings store and clause passed in

### Acceptance Criteria Validation

**Story 008-settings-panel**
- ✅ **Model: Sonnet 5.5 (default), Opus 5.5 or Haiku 5.5 with a one-line trade-off note each; used for every Claude call** (SettingsView, settings store, App: generation and profile creation)
- ✅ **Allowed sites: add presets, add the current site, remove sites** (SettingsView with the fake store) (real Chrome prompts and revocation confirmed in the manual check)
- ✅ **GDPR clause PL/EN text and mode editable; the renderer uses them** (SettingsView, App preview, bolt 009 `selectClause` tests)
- ✅ **UI language change switches the panel immediately** (SettingsView)
- ✅ **Edge case: model unavailable → the error points to the setting** (GenerationError)

**Story 009-profile-export-import**
- ✅ **Export: a JSON file with `schemaVersion`; the photo only if chosen** (backup, SettingsView)
- ✅ **Valid file: asked before replacing; becomes the active profile** (SettingsView, profile store, repository)
- ✅ **Invalid or newer-version file: rejected with a message** (backup, SettingsView)
- ✅ **Edge case: import blocked while a generation runs** (SettingsView)

### Issues Found

- Lint only: one unnecessary type assertion in a test (auto-fixed). No product issues found by the
  automated tests.

### Manual Chrome check (passed 2026-10-29, user)

Preparation: `pnpm dev` (reload the extension). Have a confirmed profile.

1. **Header:** only the app name and Settings. Open Settings → the sections show; Back returns to
   where you were (home or the editor).
2. **Model:** choose Haiku 5.5 → generate a CV → it works (and is faster). Reopen the panel → Haiku
   is still selected. Switch back to Sonnet.
3. **Language:** switch to Polish → the whole panel is Polish at once, including settings. Switch
   back.
4. **Allowed sites:** add a preset (e.g. Indeed) → Chrome asks → allow → listed. Remove it → gone
   here and in `chrome://extensions` → Site access. Remove a site in `chrome://extensions` instead
   → it disappears from the list. On an unlisted ad tab (icon clicked), "Add this site" works from
   settings too.
5. **GDPR clause:** set "Always" and change the English text → generate for an English ad → the
   preview and the PDF end with your text. Set "Never" → no clause. Restore the default texts.
6. **Privacy:** "Show the privacy notice" → the notice → close → back in settings.
7. **Export:** export without the photo → open the file → it has `"schemaVersion": 1` and no
   `photo`. Export with "Include photo" → it has `photo`.
8. **Import:** edit your profile name and confirm. Import the earlier export → asked first → Replace
   → the original name is back, and the CV on home is gone. Import a random `.json` and a
   renamed `.txt` → an error message each time, and nothing changes.
9. **Import while generating:** start a generation, open Settings → Import is disabled with a note.
10. **Look:** dark mode and ~320 px width: the sections are readable, there's no horizontal
    scrolling, and the radios and text areas are usable by keyboard.

### Notes

- The tests never run the real `claude` CLI. Chrome's permission prompts are faked at the
  allowed-sites store, whose real implementation bolt 007 tests against fake Chrome APIs.
