---
stage: test
bolt: 010-tailored-cv-ui
created: 2026-10-29T06:08:52Z
---

## Test Report: tailored-cv-ui (side panel shell, onboarding, CV upload, profile editor)

### Summary

- **Tests**: 694/694 passed workspace-wide (`pnpm test`, 78 files); extension project 374/374 (44 files). The 19 bolt-010 test files hold 145 tests.
- **Coverage**: every acceptance criterion of stories 001–004 is covered by at least one test (table below). Extension coverage target per coding standards = most important user flows; all four flows covered.
- **Checks**: `pnpm build`, `typecheck`, `lint` (0 warnings), `format:check` pass. Built manifest: same 5 permissions, no `host_permissions`, no static `content_scripts`; `cvSnapDev` absent from the production build.
- **Manual Chrome check**: passed (user, 2026-10-29)

### Test Files

- [x] `extension/src/entrypoints/sidepanel/App.test.tsx` (7) - first run notice → setup check → upload; Polish browser; confirmed profile opens home without notice; notice re-shown on version change; notice reachable from the header; unfinished draft reopens in the editor
- [x] `extension/src/features/shell/view.test.ts` (9) - view routing table (notice, setup, upload, editor, home)
- [x] `extension/src/features/shell/ErrorBoundary.test.tsx` (2) - localized error instead of a blank panel
- [x] `extension/src/lib/i18n/i18n.test.tsx` (6) - stored override over browser language, EN fallback for other languages (e.g. `de-DE`), runtime switch remembered, invalid override ignored
- [x] `extension/src/lib/i18n/messages.test.ts` (9) - EN/PL key and placeholder parity, placeholder substitution, language resolution order
- [x] `extension/src/lib/i18n/no-hardcoded-strings.test.ts` (8) - the local ESLint rule flags hard-coded JSX text and user-facing attributes, allows `t()` and punctuation
- [x] `extension/src/lib/i18n/error-messages.test.ts` (10) - every error code has PL/EN text; PDF_PARSE_FAILED reasons → specific messages; unknown errors never leak details
- [x] `extension/src/features/onboarding/privacy-notice.test.ts` (7) - versioned acknowledgement
- [x] `extension/src/features/onboarding/setup-check.test.ts` (8) - health report → issues incl. HOST_NOT_INSTALLED / HOST_DISCONNECTED, warning-only outdated version, fresh connection per check, cancel
- [x] `extension/src/features/onboarding/SetupCheck.test.tsx` (6) - one fix hint per blocking issue (host, CLI, login), non-blocking update warning, "Check again"
- [x] `extension/src/features/cv-upload/validate-file.test.ts` (7) - PDF signature, exactly 10 MB accepted, > 10 MB / non-PDF / renamed / empty rejected, chunked base64
- [x] `extension/src/features/cv-upload/create-profile-flow.test.ts` (3) - original stored → base64 sent → draft built and saved in order; cancel saves nothing; host errors passed through
- [x] `extension/src/features/cv-upload/CvUpload.test.tsx` (7) - progress, non-PDF and > 10 MB rejected before sending anything, scanned-PDF message, cancel and panel-close abort without a draft, polite live region
- [x] `extension/src/features/profile/editing.test.ts` (14) - add/edit/delete/reorder items, bullets and "other" lines; IDs stable on edit and unique on add; immutability
- [x] `extension/src/features/profile/profile-repository.test.ts` (7) - first run, confirm draft → versioned active profile, profile ID kept when editing the active one, new ID for a new CV, lenient draft vs strict confirm, duplicate IDs rejected, corrupted storage ignored
- [x] `extension/src/features/profile/store.test.ts` (8) - every edit persisted (survives reopening), undo, draft vs active, discard, photo
- [x] `extension/src/features/profile/editor/ProfileEditor.test.tsx` (12) - edit + save, Move buttons, Alt+↓ for items and for bullets only, delete + Undo, invalid-field count on confirm, replace confirmation (keep / replace, focus + Escape), Generate disabled until confirmed, photo, labelled inputs
- [x] `extension/src/features/profile/photo.test.ts` (4) - JPG/PNG ≤ 2 MB, renamed files rejected
- [x] `extension/src/lib/storage/file-store.test.ts` (1) - IndexedDB store/read/delete (fake-indexeddb)
- [x] `extension/test/setup.ts`, `extension/test/panel-fixtures.ts` - Testing Library cleanup between tests; synthetic panel fixtures

### Acceptance Criteria Validation

**Story 001-side-panel-shell-and-localization**
- ✅ **UI follows the browser language (PL/EN), English for any other** (i18n, messages, App tests)
- ✅ **Manual override switches the UI at runtime without reinstalling** (i18n test)
- ✅ **No hard-coded user-facing strings** (ESLint rule enforced in `pnpm lint` + rule tests; PL/EN key parity)
- ✅ **Error boundary instead of a blank panel** (ErrorBoundary test)

**Story 002-onboarding-and-privacy-notice**
- ✅ **Upload impossible until the notice is acknowledged; stored; re-shown on version change; reachable later** (App, privacy-notice tests)
- ✅ **Health check: each failure → specific fix hint and "Check again"; onboarding doesn't proceed while blocked; outdated version only warns** (setup-check, SetupCheck tests)

**Story 003-cv-upload-and-profile-creation**
- ✅ **PDF ≤ 10 MB accepted; anything else rejected before sending, with a message** (validate-file, CvUpload)
- ✅ **Original stored in IndexedDB; profile creation with progress** (create-profile-flow, CvUpload, file-store)
- ✅ **Scanned/damaged/password PDFs → specific messages** (error-messages, CvUpload)
- ✅ **Cancel and panel close abort; no draft saved** (create-profile-flow, CvUpload)

**Story 004-profile-review-editor**
- ✅ **Edit/add/delete/reorder items and bullets; IDs never change on edit, new IDs unique** (editing, ProfileEditor)
- ✅ **Edits persist immediately** (store)
- ✅ **Profile becomes active only on confirm; Generate disabled until then** (profile-repository, ProfileEditor)
- ✅ **Photo JPG/PNG ≤ 2 MB, optional** (photo, store, ProfileEditor)
- ✅ **Replacing the active profile asks first** (ProfileEditor)
- ⏳ Real-Chrome behaviour, dark mode, narrow width and first-frame timing: manual check below

### Issues Found

- **Alt+↑/↓ on a bullet also moved its whole job (fixed):** the key event bubbled from the bullet row to the item card; the handler now stops propagation (`features/profile/editor/fields.tsx`). Regression test: "moves only the bullet (not its job) with Alt+↓ inside a bullet".
- **Undo could wipe newer edits (fixed):** after a deletion, a later edit kept the old undo snapshot, so Undo would restore the pre-deletion profile and silently discard everything typed since. Undo now covers only the latest edit (`features/profile/store.ts`). Regression test: "drops the Undo offer after a later edit, so Undo never wipes newer edits".
- Test infrastructure: Testing Library didn't auto-clean between tests (Vitest globals are off); `extension/test/setup.ts` unmounts after each test (`extension/vitest.config.ts` `setupFiles`).

### Manual Chrome check (passed 2026-10-29, user)

Preparation: `pnpm run install-host`, then `pnpm dev`. To simulate a first run, use a fresh `pnpm dev` profile or clear the extension's storage (`chrome://extensions` → cv-snap → "Remove" and reload unpacked).

1. **First run:** open the side panel → the privacy notice appears; upload is not reachable. Click "I understand, continue" → the setup check runs.
2. **Setup check:** with the host installed, all checks pass and you can continue. Then run `pnpm run uninstall-host`, click "Check again" → "host not installed" with its fix hint, continue is blocked. Reinstall (`pnpm run install-host`), "Check again" → passes without reopening the panel.
3. **Upload:** choose a text-based CV PDF → progress steps appear and are announced; a draft profile opens in the editor. Try a PNG renamed to `.pdf` → rejected immediately.
4. **Cancel:** start another upload and click Cancel → back to the start, no error, no draft. Start again and close the side panel mid-upload → reopen: no draft was saved.
5. **Editor:** edit a field; reorder items with Move up/down and with Alt+↑/↓ (focus inside an item); Alt+↓ inside a bullet moves only that bullet; delete an item and click Undo.
6. **Persistence:** close and reopen the side panel → your edits are still there.
7. **Confirm:** confirm the profile → it becomes active and Generate becomes enabled. Upload a different CV and confirm → you're asked before the active profile is replaced; "keep" keeps it.
8. **Photo:** add a JPG/PNG ≤ 2 MB → shown; a larger or non-image file → message.
9. **Language:** switch PL ↔ EN in the header → the whole panel changes immediately and stays after reopening.
10. **Look:** switch Windows/Chrome to dark mode → readable; narrow the side panel to ~320 px → no horizontal scrolling, controls usable by keyboard.
11. **Speed:** in the side panel's DevTools console, read the "side panel first frame" timing → should be < 500 ms.

### Notes

- No test calls the real native host or Claude; the host client, storage and IndexedDB are faked.
- The 19 test files were written across two agent runs (the first was stopped before the full workspace run and this report); the second run verified coverage against every acceptance criterion and found no gaps to fill.

- Manual Chrome check passed (2026-10-29T06:35:10Z): all 11 steps OK (user).
