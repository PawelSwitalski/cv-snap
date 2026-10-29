---
stage: plan
bolt: 010-tailored-cv-ui
created: 2026-10-28T19:49:41Z
---

## Implementation Plan: tailored-cv-ui (side panel shell, onboarding, CV upload, profile editor)

### Objective

Turn the empty side panel into the first real product surface: a localised (PL/EN), themed,
accessible shell that walks a new user through the privacy notice and the setup check, takes their
CV PDF, turns it into a draft profile through the native host, and lets them review, edit and
confirm that profile as the only source of facts. Generation, preview and settings come in bolts
011/012; this bolt leaves clean seams for them.

### Deliverables

**Story 001: shell and localisation** (`extension/src/entrypoints/sidepanel/`, `extension/src/features/shell/`, `extension/src/lib/i18n/`)
- Tailwind CSS v4 (`@tailwindcss/vite`) + shadcn/ui tokens; the components this bolt needs are
  copied into `extension/src/components/ui/` (Button, Input, Textarea, Label, Card, Alert,
  Dialog/AlertDialog, Progress, Badge, Tabs/Accordion as needed)
- Theme follows `prefers-color-scheme` (CSS variables for light and dark)
- `App` = error boundary → i18n provider → view router. Views: `onboarding` (notice → setup
  check → upload), `profile-editor`, and a placeholder `generate` view for bolt 011. The route is
  derived from stored state (acknowledged notice version, health result, draft/active profile),
  not kept in the URL
- **i18n:** `extension/public/_locales/{en,pl}/messages.json` are the single source of strings
  (manifest name/description also come from there, `default_locale: "en"`). A thin helper
  `t(key, substitutions)` loads the chosen locale's `messages.json` at start-up and falls back to
  `chrome.i18n.getMessage`, because `chrome.i18n` can't switch language at runtime. Language =
  user override (stored, `"auto" | "en" | "pl"`) → browser UI language (`pl*` → PL) → EN.
  Switching the override re-renders without reinstalling. Message keys are a typed union generated
  from `en/messages.json`, so a missing key fails typecheck
- **No hard-coded strings (FR-19):** a local ESLint rule flags JSX text and string literals in
  user-facing JSX attributes (`aria-label`, `title`, `placeholder`, `alt`) inside
  `extension/src/{entrypoints/sidepanel,features,components}`; a unit test checks that `en` and
  `pl` have the same keys and placeholders
- Error boundary: localized "Something went wrong" + "Reload panel"; logs only the error name
- Startup budget ≤ 500 ms: no network on first paint; heavy modules (`@react-pdf/renderer`, the
  editor) are lazy-loaded; a `performance.now()` mark is logged in dev builds

**Story 002: onboarding and privacy notice** (`extension/src/features/onboarding/`)
- Privacy notice (FR-2 text: data goes to Anthropic through your Claude Code during generation, no
  cv-snap server, stored locally in this Chrome profile) with `PRIVACY_NOTICE_VERSION`; the
  acknowledgement stores the version in `chrome.storage.local`; a higher version shows it again.
  Upload is unreachable until acknowledged. A `showPrivacyNotice()` entry point is exported for
  bolt 012's settings
- Setup check: `createNativeHostClient().request({ type: "health" })` → `getHealthIssues()`:
  each issue (`HOST_NOT_INSTALLED`, `CLAUDE_NOT_FOUND`, `CLAUDE_NOT_AUTHENTICATED`, and the
  non-blocking `CLAUDE_VERSION_UNSUPPORTED` warning) renders its own fix hint (e.g. "Run
  `pnpm run install-host`, then reload the extension", "Run `claude` and log in") with a
  "Check again" button; errors block advancing, the warning doesn't. "Check again" opens a fresh
  port, so a host installed while the panel is open is found without reload
- Status messages via `role="alert"` (errors) / `aria-live="polite"` (checking…)

**Story 003: CV upload and profile creation** (`extension/src/features/cv-upload/`)
- File picker + drop zone: `.pdf` (type and `%PDF-` magic bytes) ≤ 10 MB, otherwise rejected
  locally with a message
- The original PDF is stored in IndexedDB (`cv-snap` DB, store `files`, key `cv-original`); only
  one original is kept
- Flow with progress (`extracting-pdf-text` → `creating-profile`) and Cancel:
  `extractPdfText` request (base64 in one message) → `ProfileExtraction.createDraft` through the
  `NativeHostProvider` (bolt 005) with the selected model (default Sonnet 5.5 until settings exist)
  → draft saved → editor opens. Closing the panel aborts (AbortController tied to `pagehide`), and
  a cancelled or failed run saves no draft
- Errors: `PDF_PARSE_FAILED` with reason (`NO_TEXT` → "scanned PDFs aren't supported",
  `PASSWORD_PROTECTED`, `CORRUPTED`, `TOO_LARGE`, `UNREADABLE`), `GENERATION_TIMEOUT`,
  `MODEL_UNAVAILABLE`, `CLAUDE_NOT_AUTHENTICATED`, `HOST_DISCONNECTED`, `CANCELLED`, each with a
  PL/EN message (this bolt adds the messages for these codes; the full error/recovery story is 011)
- With an active profile: the new upload creates a draft and the user is asked (AlertDialog)
  before the confirmed draft replaces the active profile; the active one stays usable until then

**Story 004: profile review editor** (`extension/src/features/profile/`)
- `ProfileRepository` implementation (port from bolt 005) on `chrome.storage.local`
  (`profile.active`, `profile.draft`), validated with `CvProfileSchema` /
  `ParsedCvProfileContentSchema` on read; invalid data is not loaded (logged by name only)
- Zustand store per feature (`useProfileStore`) with every mutation persisted immediately
  (write-through, debounced ~300 ms for typing, flushed on `pagehide`)
- Editor: collapsible sections (summary, experience, projects, education, skills, languages,
  certifications, other); per item/bullet edit, add, delete (with undo toast), reorder by
  Move up / Move down buttons and Alt+↑/↓ (keyboard-first, no drag-and-drop library); dates as
  month/year fields with "current"; every input has a label
- IDs: existing IDs never change; new items/bullets get `newId(prefix, existingIds)`
- Photo: JPG/PNG (type + magic bytes) ≤ 2 MB → IndexedDB `files` store, key `photo`;
  `photoRef = "photo"`; shown as a thumbnail with Remove
- Confirm → `ProfileRepository.confirm()` sets `confirmedAt`/`updatedAt`, makes it active, clears
  the draft. Generate (bolt 011) is disabled until a confirmed profile exists, with the hint
  "Confirm your profile first"
- Deleting an item that the cached last plan references: no cached plan exists before bolt 011;
  the store emits a `profileChanged` event that 011 will use to invalidate its plan

### Dependencies

- Bolts 003/004/005: `createNativeHostClient` (health, `extractPdfText`), `NativeHostProvider`,
  `ProfileExtraction`, `ProfileRepository` port, `getHealthIssues`, profile schemas, `newId`
- New (extension): `zustand` 5.0.16, `tailwindcss` 4.3.3 + `@tailwindcss/vite` 4.3.3, Radix
  primitives used by the copied shadcn components (`@radix-ui/react-dialog` 1.3.1 and the few
  others needed), `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react` (icons);
  `idb-keyval` 6.3.0 for the IndexedDB `files` store
- New (extension, dev): `@testing-library/react` 16.3.3, `@testing-library/user-event` 14.6.8,
  `fake-indexeddb` 6.2.6
- Exact versions are pinned at install time in Stage 2

### Technical Approach

- Each feature keeps UI (`*.tsx`), store (`store.ts`) and side-effect adapters (storage, native
  host) separate; adapters are injected, so components are tested with fakes
- The dev-only `cvSnapDev` hook stays as is (dynamic import behind `import.meta.env.DEV`); no UI
  for allowed sites in this bolt (bolt 012)
- Tests (Vitest + Testing Library in happy-dom, user-event for keyboard flows): i18n fallback and
  override switching, key parity PL/EN, no-hard-coded-strings rule fixtures, error boundary,
  notice versioning, every health issue → its hint + Check again, upload validation (type, magic
  bytes, size), progress/cancel/pagehide abort with a fake native host client, PDF_PARSE_FAILED
  reasons, replace-active confirmation, editor add/edit/delete/reorder (keyboard), ID stability,
  immediate persistence (fake storage), photo validation, Generate disabled until confirmed.
  Axe-style checks are out of scope; ARIA roles and labels are asserted in component tests
- Manual Chrome check (~5 min): first run in a clean dev profile → notice → setup check (with
  and without the registered host: `pnpm run uninstall-host` / `install-host`) → upload a
  synthetic PDF → edit/reorder with the keyboard → close and reopen the panel → confirm; switch the
  language override; dark mode; 320 px width

### Acceptance Criteria

- [ ] Side panel opens interactive in ≤ 500 ms (dev mark)
- [ ] PL/EN from the browser language, other languages → EN; override switches without reinstall
- [ ] Dark theme follows the system; 320 px width has no horizontal scroll
- [ ] Lint finds no hard-coded user-facing strings; PL/EN keys match
- [ ] Privacy notice blocks upload until acknowledged; shown again only for a new version; reachable later
- [ ] Each setup failure shows its own hint and "Check again"; an old Claude Code shows a non-blocking warning; a host installed meanwhile is found without reload
- [ ] PDF ≤ 10 MB stored in IndexedDB and profile creation starts with progress; non-PDF / > 10 MB rejected before sending; scanned PDF message
- [ ] New upload with an active profile asks before replacing it; closing the panel cancels creation and saves no draft
- [ ] Edit, add, delete, reorder (keyboard) items and bullets in every section; saved immediately and survives closing the panel
- [ ] Existing IDs never change; new items get new unique IDs
- [ ] JPG/PNG ≤ 2 MB photo stored and shown; others rejected
- [ ] Generate disabled with a hint until the profile is confirmed

### User Decisions (2026-10-28T19:52:48Z)

- Decision bundle 1–6 approved.
- Visual style: neutral shadcn defaults (no brand accent), light/dark following the system.
- Fallback UI language: English for browser languages other than PL/EN.
