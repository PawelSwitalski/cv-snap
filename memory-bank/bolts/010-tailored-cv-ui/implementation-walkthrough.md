---
stage: implement
bolt: 010-tailored-cv-ui
created: 2026-10-28T20:06:58Z
---

## Implementation Walkthrough: tailored-cv-ui (side panel shell, onboarding, CV upload, profile editor)

### Summary

The side panel is now the first real product surface: a Polish/English, light/dark, keyboard-usable
shell that shows the privacy notice, runs the setup check with a fix hint per problem, takes a CV
PDF and turns it into a draft profile through the native host (with progress and Cancel), and lets
the user review, edit, reorder and confirm that profile. Generation itself remains bolt 011; the
home view shows its place.

### Structure Overview

`entrypoints/sidepanel` wires real adapters (chrome.storage, IndexedDB, native host) into an `App`
that takes them as injected dependencies: error boundary → i18n provider → a view derived from
stored state (notice → setup → upload → editor → home). Each feature keeps its pure logic (file
checks, setup check, profile edits), its store or flow, and its React views apart. The editor is a
lazy-loaded chunk. All user-facing text lives in `public/_locales/{en,pl}/messages.json`.

### Completed Work

- [x] `extension/public/_locales/en/messages.json`, `extension/public/_locales/pl/messages.json` - all UI strings (148 keys each, same keys and placeholders); manifest name/description
- [x] `extension/wxt.config.ts` - Tailwind Vite plugin, localized manifest (`__MSG_…__`, `default_locale: en`)
- [x] `extension/src/assets/tailwind.css` - Tailwind entry and neutral shadcn tokens, dark theme via `prefers-color-scheme`
- [x] `extension/src/components/ui/*` - shadcn-style Button (+ variants), Input/Textarea/Select/Label/Checkbox, Card, Alert, AlertDialog (Radix), Progress
- [x] `extension/src/lib/utils.ts` - class-name merge helper
- [x] `extension/src/lib/i18n/messages.ts`, `i18n.tsx` - typed message keys, placeholder formatting, language resolution (override → browser → EN), provider and hooks
- [x] `extension/src/lib/i18n/error-messages.ts` - error code / PDF reason → message
- [x] `extension/src/lib/i18n/messages.test.ts` - PL/EN key parity, placeholders, language resolution
- [x] `extension/src/lib/storage/local-store.ts`, `file-store.ts` - chrome.storage.local and IndexedDB ports with in-memory fakes; storage key list
- [x] `extension/src/lib/file-checks.ts` - magic-byte checks and chunked base64
- [x] `extension/src/lib/panel-host.ts` - the panel's lazily opened native-host connection
- [x] `extension/src/features/shell/*` - error boundary + fallback, header (language override, Privacy), home view, view derivation
- [x] `extension/src/features/onboarding/*` - versioned privacy notice and its storage, setup check (fresh connection per check, per-issue hints, non-blocking version warning)
- [x] `extension/src/features/cv-upload/*` - file validation (type, `%PDF-` signature, ≤ 10 MB), upload → text extraction → draft flow, upload view with progress, Cancel and panel-close abort
- [x] `extension/src/features/profile/profile-repository.ts` - `ProfileRepository` on chrome.storage.local (active + draft), strict confirm, tolerant draft read
- [x] `extension/src/features/profile/editing.ts` - pure add/update/delete/move for items and lines with stable IDs
- [x] `extension/src/features/profile/photo.ts` - JPG/PNG signature and 2 MB check
- [x] `extension/src/features/profile/store.ts` - per-panel Zustand store: debounced write-through, flush on close, undo for deletions, confirm, edit-active, photo
- [x] `extension/src/features/profile/editor/*` - editor screen, section editors, labelled fields, month/year dates, line editor, keyboard reordering, replace confirmation, disabled Generate with hint
- [x] `extension/src/entrypoints/sidepanel/App.tsx`, `main.tsx` - wiring, lazy editor, dev startup mark; dev hook still dev-only
- [x] `extension/src/entrypoints/sidepanel/App.test.tsx` - first-run notice → setup check; Polish browser
- [x] `eslint.config.js` - local `no-hardcoded-ui-strings` rule for side panel, features and components (tests and the CV PDF template excluded)
- [x] `extension/package.json` - new dependencies

### Key Decisions

- **Editor always works on a draft**: a new CV creates a draft; "Edit profile" copies the active profile into a draft with the same IDs. Every edit is saved to the draft at once (survives closing the panel); "Confirm"/"Save changes" makes it active. Generation keeps using the last confirmed profile, so a half-edited profile is never used.
- **Drafts may hold empty required fields**: while typing, a cleared field is saved as is; reading tolerates only empty-text issues, and Confirm validates strictly and highlights what to fill.
- **Both locale files are bundled**: the in-app override switches instantly with no storage or fetch before first paint; the stored override is applied once read.
- **Fresh host connection per setup check**: "Check again" finds a host installed while the panel was open.
- **Cancel is not an error**: a cancelled upload (button or panel close) returns to the start without a message and saves nothing.
- **Language override in the header** until the settings panel (bolt 012) exists.

### Deviations from Plan

- **lucide-react pinned to 1.61.0** instead of the latest 1.63.0: 1.63.0 was released the same day and pnpm added a `minimumReleaseAgeExclude` exception to the workspace to install it; the exception was removed and a week-old version used instead.
- Tailwind (`tailwindcss`, `@tailwindcss/vite`) is a dev dependency (build-time only).
- Radix Slot (`@radix-ui/react-slot`) added for the shadcn Button's `asChild`.
- Lint rule scope excludes `features/cv-pdf` (CV output with its own heading tables, bolt 009).
- Placeholder Generate view: Generate is shown disabled with "arrives in the next version" on home, and "Confirm your profile first" in the editor.

### Dependencies Added

- [x] `zustand` 5.0.16 - per-feature stores
- [x] `idb-keyval` 6.3.0 - IndexedDB file store
- [x] `@radix-ui/react-alert-dialog` 1.2.1, `@radix-ui/react-slot` 1.5.0 - accessible dialog, Button `asChild`
- [x] `class-variance-authority` 0.7.1, `clsx` 2.1.1, `tailwind-merge` 3.7.0 - shadcn styling helpers
- [x] `lucide-react` 1.61.0 - icons
- [x] `tailwindcss` 4.3.3, `@tailwindcss/vite` 4.3.3 (dev) - styling
- [x] `@testing-library/react` 16.3.3, `@testing-library/user-event` 14.6.8, `fake-indexeddb` 6.2.6 (dev) - component tests

### Developer Notes

- Built side panel: main chunk 404 kB (React DOM, zod and the shared contracts via the single barrel), editor chunk 57 kB (lazy), CSS 20 kB. No new manifest permissions; no host permissions or static content scripts; the dev hook is absent from the production build.
- Startup timing: dev builds log `side panel first frame <ms>`; measure it in the Stage 3 manual check.
- Storage layout: `settings.uiLanguage`, `onboarding.privacyNoticeVersion`, `profile.active`, `profile.draft` (chrome.storage.local); IndexedDB `cv-snap`/`files`: `cv-original`, `photo`.
