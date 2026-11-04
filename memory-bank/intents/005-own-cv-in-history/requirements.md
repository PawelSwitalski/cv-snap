---
intent: 005-own-cv-in-history
phase: inception
status: complete
created: '2026-11-04T16:00:00Z'
updated: '2026-11-04T20:20:00Z'
---

# Requirements: Own CV in History

## Intent Overview

Requested by the user after testing 0.2.0 (2026-11-04): "User should also be able to save in
history his own CV that he uploaded, not only generated from AI. This Chrome extension should
allow this without connection to Claude."

Today a history entry is created only by **Download PDF** of an AI-tailored CV (intent 004,
FR-1), so the ad's title and company come from the AI's requirements, and the panel can't be used
at all without the helper (onboarding stops at the setup check). This intent:

- lets the user **save their own CV** to the history for the current job ad: by default the CV
  uploaded at setup, or another PDF picked from disk;
- does it **entirely in the extension**: no native host, no Claude;
- adds a **history-only mode** for users without the helper: upload a CV PDF and track
  applications; tailoring stays locked until the helper is installed.

Already available offline: the original CV PDF from setup (IndexedDB `cv-snap` / `files` /
`cv-original`), the ad capture and cleaned page snapshot (content script, intent 004 FR-2), and
the JSON-LD title and company (`features/job-ad/json-ld.ts`).

## Business Goals

| Goal | Success Metric | Priority |
|------|----------------|----------|
| Every application is in one place, tailored or not | An application sent with the user's own CV appears in History with its ad, PDF and sent date | Must |
| cv-snap is useful without Claude | A user without the helper can set up, save a CV for an ad and see it in History | Must |
| Clear which CV was sent | Each history entry shows whether it is the user's own CV or a tailored one | Must |

---

## Functional Requirements

### FR-1: Save my CV for the current ad

- **Description**: On a job ad (detected, or a manual selection, as for Generate), the panel shows
  **Save my CV to history** next to Generate. It saves the stored original CV, as uploaded at
  setup, together with the ad. A secondary action **Choose another PDF…** saves a file picked
  from disk instead. No request goes to the native host.
- **Acceptance Criteria**:
  - With the helper not installed (or disconnected), Save my CV to history creates a history entry
    for the ad, with the stored CV's exact bytes as the PDF.
  - Choose another PDF… accepts the same files as the CV upload (a `.pdf` with the `%PDF-`
    signature, not empty, at most 10 MB) and shows the same messages for anything else; the
    picked file is saved to that entry only and does not replace the stored CV.
  - The ad text and the cleaned page snapshot are saved as for a generated CV (5 MB snapshot
    limit; "not available" when it can't be taken).
  - After saving, the panel shows "Saved to history" with **Show in history**, as after Download PDF.
  - If no CV is stored (it was never uploaded or was deleted), Save my CV to history is replaced
    by Choose another PDF….
  - If saving fails, the user sees a non-blocking error and nothing partial stays in History.
- **Priority**: Must

### FR-2: Title and company without AI

- **Description**: Before saving, the panel shows **Job title** and **Company** fields,
  prefilled offline: from the ad's JSON-LD when present; otherwise the job title from the page
  title and the company empty. The user can edit both; both may be left empty.
- **Acceptance Criteria**:
  - On an ad with JSON-LD `JobPosting`, the fields show its `title` and `hiringOrganization` name.
  - Without JSON-LD, Job title shows the page title (trimmed, at most 200 characters) and Company
    is empty; the History list then shows the ad's site, as for generated entries.
  - The saved entry stores exactly the edited values.
- **Priority**: Must

### FR-3: Which CV an entry holds

- **Description**: Each history entry records its source: **your CV** (FR-1) or **tailored**
  (Download PDF). The History list and the entry details show it; the PDF file name for an own
  CV is the picked file's name, or the stored CV's original name.
- **Acceptance Criteria**:
  - An entry saved with FR-1 shows "Your CV"; one saved by Download PDF shows "Tailored".
  - Entries from 0.2.0 (without a source) show "Tailored".
  - Open PDF opens the saved own CV unchanged.
- **Priority**: Must

### FR-4: One entry per ad, either kind

- **Description**: The rule of intent 004 stays: one entry per ad (`AdKey`). Saving an own CV for
  an ad with a tailored entry replaces it, and the other way round, like a re-download.
- **Acceptance Criteria**:
  - Saving an own CV for an ad already in History leaves one entry, with the new PDF, source,
    title, company and last-saved date; the created date and the sent date are kept.
  - Download PDF of a tailored CV for an ad with an own-CV entry does the same.
  - The "already in history" hint in Generate shows for both kinds and says which one it is.
  - Before replacing an entry of the other kind, the panel asks for confirmation.
- **Priority**: Must

### FR-5: History-only mode without the helper

- **Description**: When the setup check fails (helper missing, Claude not found or not logged in),
  it offers **Use without the helper** next to Check again. The user then uploads a CV PDF, which
  is stored as the original CV without being read by AI, and lands on home in history-only mode:
  on a job ad they can use FR-1 and FR-2; Generate is replaced by a short note "Tailoring needs the
  helper" with **Set up the helper**, which runs the setup check again. History, Settings, the
  privacy notice and backups work as usual.
- **Acceptance Criteria**:
  - With the helper not installed, a new user can acknowledge the notice, choose Use without the
    helper, upload a PDF, save it for an ad and see the entry in History, with no native
    messaging connection opened after the setup check.
  - The choice is remembered: the next panel opening goes straight to home in history-only mode.
  - Set up the helper: once the check passes, the panel offers **Create my profile from my CV**,
    which runs the normal profile extraction on the stored CV and continues as onboarding does
    today (editor, then home with Generate). History entries are kept.
  - A user who already has a profile is never put in history-only mode; if their helper goes
    missing, FR-1 still works (the existing setup and generation errors are unchanged).
- **Priority**: Must

### FR-6: Replace my stored CV

- **Description**: In history-only mode, Settings shows **Your CV** with the stored file's name and
  **Replace…**, which stores a new PDF (same checks as FR-1). With a profile, uploading a new CV
  works as today (it also replaces the stored CV).
- **Acceptance Criteria**:
  - After Replace…, Save my CV to history saves the new file; existing entries keep their PDFs.
- **Priority**: Should

### FR-7: Backups without a profile

- **Description**: A backup in history-only mode holds the history (and settings it holds today)
  without a profile. Importing such a backup restores the history and leaves the profile as it is.
  Own-CV entries keep their source through export and import.
- **Acceptance Criteria**:
  - Export in history-only mode makes a file that imports on a second clean profile, giving the same
    entries, sources and PDFs, in history-only mode.
  - Importing a backup with a profile into history-only mode creates the profile (as today) and
    leaves history-only mode.
  - Backups from 0.1.x and 0.2.0 import unchanged.
- **Priority**: Must

---

## Non-Functional Requirements

### Privacy and offline

| Requirement | Metric | Target |
|-------------|--------|--------|
| No helper or Claude in FR-1, FR-2, FR-6 | Native messaging connections opened by the save flow | 0 (asserted in tests and the e2e) |
| No network | Requests made by the save flow | 0 (as for the rest of the extension) |
| Privacy policy | Text | Says that an own CV can be stored in History and, in history-only mode, nothing goes to Claude; version bump only if what is stored or sent changes beyond that |

### Performance

| Requirement | Metric | Target |
|-------------|--------|--------|
| Save my CV to history | Time from click to "Saved to history" for a 10 MB PDF | < 1 s on the reference laptop |

### Compatibility

| Requirement | Metric | Target |
|-------------|--------|--------|
| Existing history | 0.2.0 entries | Read unchanged, shown as Tailored; no migration |
| Backups | 0.2.0 reading a backup from this release | Imports if it has a profile (own-CV entries read as Tailored); a backup without a profile needs this release (stated in the release notes) |

### Testing

| Requirement | Metric | Target |
|-------------|--------|--------|
| Unit and component tests | New logic | Covered as in intent 004 |
| E2E | Playwright | One test: history-only mode with no helper installed, save an own CV, see it in History |

---

## Constraints

### Technical Constraints

**Intent-specific constraints**:

- The history entry schema stays at version 1; the source is an optional field read as
  "tailored" when absent, so 0.2.0 still reads entries and backups that don't use it.
- The native host is not changed; this release needs no new helper.
- The stored original CV (`cv-original`) is the one file used by FR-1; no second copy is kept.

### Business Constraints

- Planned as the next release after 0.2.0 (version to decide at the release; no host change).

---

## Assumptions

| Assumption | Risk if Invalid | Mitigation |
|------------|-----------------|------------|
| The ad capture and snapshot need no helper | Save without the helper fails | Already true in 0.2.0 (content script); covered by the e2e |
| JSON-LD or the page title is good enough for title and company | Entries with poor titles | The user edits the fields before saving (FR-2) |
| Users without Claude find value in a history alone | Mode unused | Ask testers; it costs no Claude usage |

---

## Open Questions

| Question | Owner | Due Date | Resolution |
|----------|-------|----------|------------|
| Which CV file: the uploaded original, a file picked at save time, or both? | user | 2026-11-04 | Both: stored CV by default, Choose another PDF… (user) |
| Must it work for a user who never installed the helper (no profile)? | user | 2026-11-04 | Yes: history-only mode, tailoring locked (user) |
| An ad already in history with a generated CV: replace or keep both? | user | 2026-11-04 | Replace, one entry per ad; entry shows its source (user) |
