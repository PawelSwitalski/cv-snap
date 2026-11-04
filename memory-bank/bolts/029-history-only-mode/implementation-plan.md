---
stage: plan
bolt: 029-history-only-mode
created: 2026-11-04T18:00:00Z
---

## Implementation Plan: 002-history-only-mode (bolt 029)

### Objective

Someone without the helper can still use cv-snap. They choose "Use without the helper" at the
setup check, upload their CV PDF (stored, not read by AI), and land on a home screen where they
save their CV for each ad and use History. Later, "Set up the helper" turns the stored CV into a
profile without losing anything. In this mode, Settings lets them replace the stored CV.

### Deliverables

1. **Mode flag** (`lib/storage/local-store.ts`, `features/shell/history-only.ts`)
   - `STORAGE_KEYS.historyOnly` (`panel.historyOnly`, boolean): read and write helpers, invalid = off.
   - Written only after the CV upload in this mode succeeds. It is ignored, and cleared, as soon as
     a profile exists, so a user with a profile is never in this mode.
2. **View routing** (`features/shell/view.ts`): three new views.
   - `history-upload`: after "Use without the helper"; Back returns to the setup check.
   - `history-home`: the flag is on and there is no profile or draft.
   - `helper-setup`: "Set up the helper" from history-home shows the setup check, then the
     profile upload with the stored CV.
   - Order: loading → privacy → settings → history → editor (draft) → home (profile) → the
     history-only views → upload → setup. A draft or a profile always wins over the flag.
3. **Setup check** (`features/onboarding/SetupCheck.tsx`), two optional props:
   - `onUseWithoutHelper`: when the check fails (an error, not a warning), it shows **Use without
     the helper** next to Check again, with one line explaining that tailoring needs the helper.
   - `onBack`: a Back button, used when the user came from history-only home, so they can return
     after a failed check.
4. **Upload without AI** (`features/cv-upload/StoreCvOnly.tsx`, story 001)
   - The same PDF checks and messages as `CvUpload` (`validateCvFile`). It stores the file as
     `cv-original`, sets the flag, and nothing else: no host request, no draft.
   - Drag and drop and a file input, as in CvUpload. The text says the CV stays on this computer.
5. **History-only home** (`features/shell/HistoryOnlyHome.tsx`, story 001)
   - Watches the page like GenerateView (`watchPageState`). Shows:
     - on an allowed page: `SaveOwnCv` (bolt 028) and the already-in-history hint;
     - on an unlisted site: **Add this site**, the same control as Generate's, moved into a small
       `AddSiteButton` that GenerateButton also uses;
     - otherwise: the existing page notes ("click the cv-snap icon", "not a web page"…);
     - a note card, "Tailoring needs the helper", with **Set up the helper**.
   - The header's History and Settings work as on home.
6. **Set up the helper later** (story 002)
   - **Set up the helper** opens `helper-setup`: the setup check, with Back to history-only home.
     Continue (check passed) shows `CvUpload` with a new optional `storedFile` prop: a primary
     **Create my profile from my CV** (`file name`) button that runs the normal profile creation
     on the stored file. Choosing another file still works.
   - When the draft is created, the editor opens as in onboarding. On confirm, the profile is
     active and the flag is cleared. History and the stored CV are untouched. An extraction error
     shows the existing upload error, and Back returns to history-only home.
7. **Replace my stored CV** (`features/settings/YourCvSection.tsx`, story 003, Should)
   - Settings shows a **Your CV** section in history-only mode only: the stored file's name and
     **Replace…**, which uses the same checks and writes `cv-original`. Existing entries keep their
     own PDFs (they are copies).
8. **Strings**: en/pl for the new button, notes and section.

### Dependencies

- Bolt 028: `SaveOwnCv`, the history store's `recordOwnCv`, `storedCvName`.
- Existing onboarding: `SetupCheck`, `CvUpload`, `createProfileFromPdf`, `validateCvFile`.

### Technical Approach

- The host client is lazy (`panelHostClient` opens the port on first use). History-only views
  never call it, so no native messaging port opens after the setup check. A test asserts this.
- `deriveView` stays a pure function with two new inputs (`isHistoryOnly`,
  `historyOnlyStep: "upload" | "helper-setup" | null`); unit-tested by itself.
- Backups without a profile are bolt 030. Until then, Backup in Settings shows its existing
  "no profile yet" note in this mode.

### Acceptance Criteria (stories 001–003)

- [ ] A failing setup check offers Use without the helper; a passing one doesn't
- [ ] Upload stores the PDF with no host call and lands on history-only home
- [ ] History-only home: Save my CV on allowed pages, Add this site on unlisted ones, "Tailoring needs the helper" with Set up the helper
- [ ] Reopening the panel goes straight to history-only home, without a setup check
- [ ] History, Settings and the privacy notice work in this mode
- [ ] A user with a profile is never in this mode (flag ignored and cleared)
- [ ] Set up the helper → check passes → Create my profile from my CV → editor → home with Generate; history and stored CV unchanged; flag off
- [ ] A check that fails again lets the user go back to history-only home
- [ ] An extraction error keeps the user in history-only mode
- [ ] Settings → Your CV shows the stored file and Replace… (valid PDF replaces; invalid shows the message)

### Tests (stage 3)

- `view.test.ts`: every new route and its precedence.
- `history-only.test.ts`: flag read/write and invalid values.
- `SetupCheck.test.tsx`: Use without the helper shown only when blocked; Back.
- `StoreCvOnly.test.tsx`, `YourCvSection.test.tsx`: checks, storing, messages.
- `App.test.tsx`: the whole path with a host that isn't installed (setup fails → use without →
  upload → home → save own CV → reopen → still history-only); no host request after the setup
  check; helper later → profile → Generate; an existing profile ignores the flag.
