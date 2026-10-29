---
intent: 001-one-click-tailored-cv
phase: inception
status: construction
created: 2026-10-25T11:00:00Z
updated: 2026-10-29T13:03:10Z
---

# Requirements: One-Click Tailored CV

## Intent Overview

Tailoring a CV to each job ad by hand is slow, and AI tools that do it often invent skills or experience. cv-snap lets a job seeker who uses Claude Code generate, with one click, a CV tailored to the job ad open in the current tab, built **only** from facts in a CV profile they have reviewed, with every claim checked against that profile before it is shown.

**Type**: New feature (green-field)
**Primary users**: the project author and a few early testers, on **Windows** (code kept portable to macOS/Linux; tested there later).
**Languages**: CV source and job ads in **any language**; the generated CV is always written **in the language of the job ad**. The UI is Polish/English.

### In Scope (MVP)
- Native host install (`pnpm run install-host`) and health check
- First-run privacy notice
- PDF upload → structured CV profile → user review and editing
- Allowed-sites management (presets, "Add this site", removing sites)
- Job ad detection and extraction on allowed sites, with manual text selection as the fallback
- One-click generation: requirements → tailoring plan → deterministic validator → retry → *unverified* markers and a gaps list
- Side panel preview with editing; PDF download using **one** cv-snap template
- GDPR consent clause (klauzula RODO) handling
- Profile Export/Import (JSON)
- English and Polish UI

### Out of Scope (future intents)
- Strict mode (AI verification pass)
- Formats other than PDF, for input and output (DOCX, Markdown, LinkedIn text)
- Multiple templates, or templates that imitate the user's original design
- Site-specific extraction adapters
- Direct Anthropic API provider (users without Claude Code)
- Chrome Web Store and npm release
- Generation history beyond the current session
- OCR for scanned or image-only PDFs
- Official macOS/Linux support (portable code, but not tested in this intent)

---

## Business Goals

| Goal | Success Metric | Priority |
|------|----------------|----------|
| Never present made-up facts as verified | 0 fabricated facts pass the validator across the regression fixture set | Must |
| Save time per application | One click to a downloadable CV; generation ≤ 60 s p95 | Must |
| Output good enough to send as-is | ≥ 70% of CVs generated for real ads are downloaded without manual edits | Should |
| Low setup friction for Claude Code users | From clone to first generated CV in ≤ 15 minutes following the README | Should |

---

## Functional Requirements

### FR-1: Native host installation and health check
- **Description**: A `pnpm run install-host` script builds the native host and registers its native-messaging manifest for Chrome on Windows (HKCU registry key) with `allowed_origins` limited to the cv-snap extension ID. The extension can run a health check that verifies (a) the host is reachable, (b) the `claude` CLI is on the PATH, (c) Claude Code is logged in.
- **Acceptance Criteria**:
  - Running the script on a clean Windows machine with Node and Claude Code installed registers the host, with no admin rights required.
  - Running the script twice is safe and leaves one correct registration.
  - The health check reports each of the three conditions separately; each failure maps to a specific error code (`HOST_NOT_INSTALLED`, `CLAUDE_NOT_FOUND`, `CLAUDE_NOT_AUTHENTICATED`) with a fix hint shown in the UI.
  - An uninstall script (`pnpm run uninstall-host`) removes the registration.
- **Priority**: Must

### FR-2: First-run onboarding and privacy notice
- **Description**: On first open, the side panel walks the user through: privacy notice → host health check → CV upload. The privacy notice states that the CV profile and job ads are sent to Anthropic via the user's Claude Code during generation, that cv-snap has no server, and that all data is stored locally in this Chrome profile.
- **Acceptance Criteria**:
  - CV upload is not possible until the user has acknowledged the privacy notice.
  - The acknowledgement is stored, and the notice is not shown again unless its text version changes.
  - The notice is reachable later from settings.
  - If the health check fails, onboarding shows the fix hint and a "Check again" button, and does not proceed to upload.
- **Priority**: Must

### FR-3: CV PDF upload and text extraction
- **Description**: The user uploads a PDF CV; the extension stores the original in IndexedDB and sends it to the host, which extracts its text with `pdfjs-dist`, preserving reading order for single- and two-column layouts as well as possible.
- **Acceptance Criteria**:
  - Accepts `.pdf` files up to 10 MB; anything else is rejected before sending, with a message.
  - A PDF with no extractable text (scanned/image-only) fails with `PDF_PARSE_FAILED` and a message that scanned PDFs aren't supported.
  - Text is extracted correctly from the fixture set of text-based PDFs (single-column and two-column).
- **Priority**: Must

### FR-4: Structured CV profile creation
- **Description**: Claude converts the extracted text into a structured CV profile (schema in `shared/`): contact details, headline/summary, work experience (company, title, dates, location, bullets), projects, education, skills, languages, certifications, and other sections. Every section item and bullet has a stable unique `id`. The profile records its source language.
- **Acceptance Criteria**:
  - Output is validated against the profile schema; invalid output is retried once, then fails with `GENERATION_FAILED`.
  - Every item and bullet has a unique `id`.
  - On the fixture set, the profile contains no facts absent from the source text (verified by fixture tests).
  - Profile creation completes in ≤ 90 s p95.
- **Priority**: Must

### FR-5: Profile review and editing
- **Description**: After creation, the user reviews the profile in an editor and can edit, add, delete, and reorder items and bullets, and add an optional photo. The profile only becomes the "active" source of facts once the user confirms it. Later edits are possible at any time.
- **Acceptance Criteria**:
  - Generation is disabled until a profile has been confirmed at least once.
  - Edits persist in `chrome.storage.local` immediately (no explicit save lost on panel close).
  - New items get new unique IDs; IDs of existing items never change on edit.
  - Photo upload accepts JPG/PNG up to 2 MB; the photo is stored in IndexedDB and is optional.
  - Uploading a new PDF creates a new profile draft and asks before replacing the active profile.
- **Priority**: Must

### FR-6: Allowed sites management
- **Description**: The user manages the list of sites cv-snap may read. Sites are added from one-click presets (LinkedIn, Indeed, Pracuj.pl, justjoin.it, NoFluffJobs, Bulldogjob) or via "Add this site" on the current tab. Adding requests the Chrome host permission for that origin; removing revokes it.
- **Acceptance Criteria**:
  - The manifest declares no host permissions; access exists only for origins the user granted.
  - Adding a site triggers Chrome's permission prompt; if the user denies, the site is not added.
  - Removing a site revokes the permission and unregisters the content script for it.
  - On an unlisted page, the Generate button is replaced by "Add this site"; after approval, the user can generate without reloading the side panel.
  - The list stays in sync with Chrome: a permission revoked in `chrome://extensions` disappears from the list.
- **Priority**: Must

### FR-7: Job ad detection and extraction
- **Description**: On allowed sites, a content script extracts the page's main readable text using Mozilla Readability and runs a scoring heuristic to decide whether the page looks like a job ad. When it does, the toolbar icon shows a badge. Signals (strongest first):
  1. **Structured data**: a schema.org `JobPosting` JSON-LD block on the page (used by most job boards; language-independent). When present, its fields (title, company, description) also seed the extraction.
  2. **URL patterns**: known job-ad paths for the preset boards (e.g. `linkedin.com/jobs/view/…`, `pracuj.pl/praca/…`, `justjoin.it/job-offer/…`).
  3. **Page keywords**: apply buttons and section headings, e.g. "Apply", "Aplikuj", "Requirements", "Wymagania", "Responsibilities", "Obowiązki", "Salary", "Wynagrodzenie".
- **Acceptance Criteria**:
  - A page with a `JobPosting` JSON-LD block, or a matching preset URL pattern, is always detected.
  - Keyword signals alone require a threshold score (tuned on fixtures) to avoid false positives on search/listing pages.
  - On allowed-site fixture pages that contain a job ad, extraction returns the ad text (title, description, requirements sections included).
  - The badge appears on detected job ads and clears on navigation away.
  - On pages where no ad is detected, Generate returns `JOB_AD_NOT_DETECTED` and offers the manual fallback (FR-8).
  - Extracted text is capped at 50,000 characters before sending.
- **Priority**: Must

### FR-8: Manual selection fallback
- **Description**: On an allowed site, the user can select the ad text on the page and generate from the selection instead of the automatic extraction.
- **Acceptance Criteria**:
  - If text is selected when the user clicks Generate, the selection is used.
  - When there is no selection and no ad is detected, the UI says to "select the ad text and try again".
  - Selections shorter than 200 characters are rejected with a message.
- **Priority**: Must

### FR-9: Job requirements parsing and caching
- **Description**: Claude converts the ad text into structured requirements: job title, company, location, must-haves, nice-to-haves, keywords, seniority, and the ad's language. Results are cached per ad URL for 7 days.
- **Acceptance Criteria**:
  - Output is schema-validated.
  - The detected language is an ISO 639-1 code (any language).
  - Generating again for the same URL within 7 days skips this step (no Claude call).
  - Parsed requirements are shown in the side panel next to the preview.
- **Priority**: Must

### FR-10: Tailored CV generation
- **Description**: One click on Generate runs the full pipeline: extract → requirements → tailoring → validation → render preview. Claude receives the active profile and the requirements, and returns a tailoring plan: selected items with relevance ranks, order, rephrased bullets, a tailored summary, a skills selection, and a gaps list. Every output line cites `sourceIds`.
- **Acceptance Criteria**:
  - A single click (on a detected ad, with a confirmed profile) produces a preview with no further input.
  - Every bullet, summary sentence, and skill in the plan cites at least one existing profile `id`.
  - Requirements the user doesn't meet appear only in the gaps list, never in the CV.
  - Claude runs with all tools disabled, in an empty temporary working directory, with capped turns; ad text is passed as delimited data.
- **Priority**: Must

### FR-11: Deterministic validation and retry
- **Description**: Plain code (no LLM) validates every plan before display. It rejects: unknown or missing `sourceIds`; skills/technologies not in the profile; numbers, dates, percentages, company names, and job titles not present in the cited source items. Comparison uses language-independent facts so translated output can still be checked. On failure, the plan is regenerated once with the validator errors attached; lines that still fail are shown marked **unverified**.
- **Acceptance Criteria**:
  - The validator is a pure function with unit tests for every rejection rule.
  - Across the regression fixture set, 0 fabricated facts pass as verified.
  - At most one retry per generation.
  - Unverified lines are visibly marked (icon + text, not only color) and listed in a summary ("2 lines couldn't be verified").
  - The user can remove or edit unverified lines before download.
- **Priority**: Must

### FR-12: Output language
- **Description**: The generated CV is written in the language of the job ad, **whatever that language is**, even when the profile is in a different language. The user can override the output language per generation (any language, chosen from a searchable list).
- **Acceptance Criteria**:
  - A Polish ad with an English profile produces a Polish CV, and vice versa; a German ad produces a German CV.
  - All languages are supported equally; there is no "unsupported language" notice.
  - The override applies only to the current generation.
  - Section headings and fixed template labels: built-in translations for PL/EN; for other languages, Claude supplies the headings in the plan (headings only, not facts, so they are outside the validator's fact checks).
  - The validator works for every language because it compares language-independent facts (FR-11).
- **Priority**: Must

### FR-13: Preview and editing
- **Description**: The side panel shows a live preview of the tailored CV, the parsed requirements, the gaps list, and unverified markers. The user can edit any line's text, remove items, and regenerate.
- **Acceptance Criteria**:
  - Edited lines are marked "user-edited" and are excluded from validation.
  - Removing an item updates the preview immediately.
  - "Regenerate" runs the pipeline again (using cached requirements).
  - The preview matches the downloaded PDF content.
- **Priority**: Must

### FR-14: PDF rendering and download
- **Description**: The extension renders the final CV with `@react-pdf/renderer` using one cv-snap template (A4) and downloads it.
- **Acceptance Criteria**:
  - Output is A4, **at most 2 pages**. If content exceeds 2 pages, the lowest-ranked items are dropped deterministically until it fits, and the user is told which items were dropped.
  - The photo is included if the profile has one.
  - The file is named `CV_{FirstName}_{LastName}_{Company}.pdf` (ASCII-safe).
  - Text in the PDF is selectable (not an image) so applicant tracking systems (ATS) can parse it.
  - Rendering happens fully in the extension; no PDF crosses native messaging.
- **Priority**: Must

### FR-15: GDPR consent clause (klauzula RODO)
- **Description**: The user can edit a consent clause in settings (prefilled with a standard Polish template and an English equivalent). A setting controls when it is added: **Polish ads only** (default), always, or never.
- **Acceptance Criteria**:
  - With the default setting, a CV for a Polish ad includes the clause in the footer and an English one does not.
  - The clause text is taken from settings verbatim; it is never generated by Claude.
- **Priority**: Should

### FR-16: Progress and cancel
- **Description**: During generation, the side panel shows step progress (reading ad → parsing requirements → tailoring → validating → rendering) and a Cancel button.
- **Acceptance Criteria**:
  - Progress updates arrive over the native-messaging port and are announced via an `aria-live` region.
  - Cancel stops the `claude` child process within 2 s and returns the UI to the ready state.
  - Closing the side panel during generation cancels it.
- **Priority**: Must

### FR-17: Error handling and recovery
- **Description**: Every failure surfaces a user-facing message with a fix hint, mapped from the shared error codes.
- **Acceptance Criteria**:
  - Each error code in `shared/` has a PL and EN message.
  - A generation exceeding 120 s fails with `GENERATION_TIMEOUT` and kills the child process.
  - If the native host disconnects unexpectedly, the UI shows a reconnect option.
  - No error leaves the UI stuck in a loading state.
- **Priority**: Must

### FR-18: Profile Export / Import
- **Description**: The user can export the active profile (and settings, optionally) to a JSON file and import it on another machine or after reinstalling.
- **Acceptance Criteria**:
  - The export contains a schema version.
  - Import validates the file against the schema and rejects invalid files with a message.
  - Import asks before replacing an existing profile.
  - Photo export is optional (embedded as base64 when chosen).
- **Priority**: Should

### FR-19: UI localization (PL/EN)
- **Description**: All UI strings are available in Polish and English via `chrome.i18n`, following the browser's UI language with a manual override in settings.
- **Acceptance Criteria**:
  - No hard-coded user-facing strings (lint/check passes).
  - Switching the override changes the UI language without reinstalling.
- **Priority**: Should

### FR-20: Model selection
- **Description**: The user chooses which Claude model cv-snap uses, in settings. The default is **Claude Sonnet 5.5** (`claude-sonnet-5-5`). The choice is passed to Claude Code with `--model` for every step.
- **Acceptance Criteria**:
  - Settings offer Sonnet 5.5 (default), Opus 5.5, and Haiku 5.5, with a one-line note on the trade-off (quality vs. speed/usage).
  - The selected model is used for every Claude call (profile, requirements, tailoring).
  - If the model isn't available on the user's Claude plan, generation fails with `MODEL_UNAVAILABLE` and a hint to choose another model.
  - Performance targets (NFRs) are measured with the default model.
- **Priority**: Must

---

## Non-Functional Requirements

### Performance
| Requirement | Metric | Target |
|-------------|--------|--------|
| Tailored CV generation (click → preview) | p95 end-to-end | ≤ 60 s |
| Generation with cached requirements | p95 end-to-end | ≤ 45 s |
| Profile creation from PDF | p95 | ≤ 90 s |
| Side panel open to interactive | p95 | ≤ 500 ms |
| PDF render + download | p95 | ≤ 3 s |
| Hard timeout per Claude call | — | 120 s |

### Scalability
Not applicable: single-user, local-only. Each request is handled independently; the host processes one generation at a time per extension connection.

### Security
| Requirement | Standard | Notes |
|-------------|----------|-------|
| Prompt-injection resistance | Tools disabled, data delimiting, schema + validator | Regression fixtures include ads with injected instructions; none may change behavior or leak the profile into unexpected fields |
| Site access | User-granted origins only | No default host permissions |
| Host access | `allowed_origins` = cv-snap ID | Messages zod-validated; size limits enforced (64 MB inbound, < 1 MB outbound) |

### Reliability
| Requirement | Metric | Target |
|-------------|--------|--------|
| Host robustness | Crashes on malformed or oversized messages | 0 (fuzz/integration tests) |
| Cancel responsiveness | Time to kill child process | ≤ 2 s |
| Data durability | Profile loss on panel close / browser restart | None |

### Output Quality
| Requirement | Metric | Target |
|-------------|--------|--------|
| Fabrication | Fabricated facts passing as verified (regression set) | 0 |
| Usability of output | Downloaded without edits, on real ads | ≥ 70% |
| Regression set size | Real job ads × fixture CVs (provided by the project author) | ≥ 20 ads, ≥ 3 CVs (see composition below) |

**Regression set composition** (provided by the project author before the validator bolt):
- **CVs (minimum 3, ideally 5)**, anonymized (fake name and contact details; keep the real dates, numbers, companies, and skills, since those are what the validator checks):
  1. Your real CV, in Polish.
  2. An English CV (yours translated, or a different one).
  3. A clearly different profile: another field or seniority level, ideally a **two-column** PDF layout.
  4. *(optional)* A CV with long history (to exercise the 2-page limit).
  5. *(optional)* A short, junior CV (to exercise the gaps list).
- **Job ads (minimum 20)**, saved as page HTML or text, with the URL:
  - ~8 Polish and ~8 English, from different preset boards
  - ~2 in another language (e.g. German)
  - several that **don't** match the CVs well (to test the gaps list)
  - ~3 **prompt-injection cases** (derived from real ads by adding hidden instructions; can be generated during construction)

### Compatibility
| Requirement | Target |
|-------------|--------|
| OS | Windows 11 (MVP); code portable to macOS/Linux |
| Browser | Current stable Chrome (MV3, Side Panel API) |
| Node | Current LTS |
| Claude Code | **Minimum = the version tested during construction** (recorded in the host); the health check warns if the installed version is older and suggests updating |

### Privacy / Compliance
| Requirement | Standard | Notes |
|-------------|----------|-------|
| Personal data minimization | GDPR spirit | Data stored only locally; sent only to Anthropic via the user's Claude Code; never logged |
| Transparency | First-run notice | See FR-2 |
| Consent clause | Polish employer practice | See FR-15; user-controlled text |

---

## Constraints

### Technical Constraints

**Project-wide standards**: Required standards will be loaded from memory-bank standards folder by Construction Agent

**Intent-specific constraints**:
- Chrome native messaging limits host → extension messages to 1 MB, so the profile and plan JSON must stay well under it; the host never returns PDFs.
- Headless Claude Code is the only model access in this intent; no direct API calls.
- The klauzula RODO text is never AI-generated.

### Business Constraints
- Single developer, hobby/portfolio budget: no paid infrastructure.
- Generation uses the user's own Claude subscription limits.

---

## Assumptions

| Assumption | Risk if Invalid | Mitigation |
|------------|-----------------|------------|
| Users have Node LTS and Claude Code installed and logged in | Host can't run | Health check with clear fix hints (FR-1) |
| Claude Code headless mode can disable all tools and return JSON reliably | Prompt-injection exposure, parsing failures | Verify flags in the first construction bolt (spike); fall back to schema-in-prompt + strict parsing |
| Source CVs are text-based PDFs | Extraction fails | Clear `PDF_PARSE_FAILED` message; OCR is a future intent |
| Readability extracts ads well on the preset job boards | Poor requirements, weak CV | Manual selection fallback (FR-8); site adapters as a future intent |
| Generation fits within 60 s p95 | Slow UX | Requirements cache; progress UI; choose a faster model for the parsing steps if needed |
| A deterministic validator can check translated output | False "unverified" flags in cross-language CVs | Compare language-independent facts; tune with PL↔EN and other-language fixtures |
| The user's Claude plan includes the selected model | Generation fails | `MODEL_UNAVAILABLE` with a hint (FR-20) |

---

## Open Questions

| Question | Owner | Due Date | Resolution |
|----------|-------|----------|------------|
| Which Claude model(s) to use? | Project author | 2026-10-25 | Resolved: user-selectable in settings, default Sonnet 5.5 (FR-20) |
| Exact Claude Code flags for disabling tools and structured output; minimum supported version | Construction | First host bolt (spike) | Partly resolved: minimum = version tested during construction; flags confirmed in spike |
| Source of the regression fixture set (real ads + anonymized CVs) | Project author | Before validator bolt | Resolved: project author provides ≥ 3 CVs and ≥ 20 ads (see Output Quality) |
| Heuristic for "page looks like a job ad" | Project author | 2026-10-25 | Resolved: JSON-LD `JobPosting` + URL patterns + page keywords (FR-7); threshold tuned on fixtures |
