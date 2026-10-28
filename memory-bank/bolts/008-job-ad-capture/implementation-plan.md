---
stage: plan
bolt: 008-job-ad-capture
created: 2026-10-28T06:44:05Z
---

## Implementation Plan: job-ad-capture (detection, extraction, manual selection)

### Objective

On allowed sites, recognise job-ad pages and show a badge on the toolbar icon (story 003). On
Generate, capture the ad's readable text with structured JSON-LD seed fields, stripped of hidden
content and capped at 50,000 characters (story 004). Otherwise, use the user's text selection, or
return `JOB_AD_NOT_DETECTED` with guidance (story 005). The output is the `AdInput` that bolt 005's
`RequirementsResolution` already consumes (`text`, `url`, `structuredFields`,
`isManualSelection`). Requirements parsing and the Generate button are out of scope (bolt 005 and
UI bolt 011).

### Deliverables

**Story 003: detection** (`extension/src/features/job-ad/`)
- `detect.ts` (pure): `scoreJobAd({ url, document })` returns
  `{ score, isJobAd, signals[] }`. Signals, strongest first:
  1. **JSON-LD `JobPosting`**: any `<script type="application/ld+json">` whose parsed value (object,
     array or `@graph`) has `@type` `JobPosting` (string or array). It **always** detects. The JSON
     is parsed defensively; invalid JSON is ignored.
  2. **Preset URL patterns** (`url-patterns.ts`, a table keyed by preset id). They **always**
     detect:
     - LinkedIn `/jobs/view/…`
     - Indeed `/viewjob` or `?jk=`
     - Pracuj.pl `/praca/…,oferta,…`
     - justjoin.it `/job-offer/…`
     - NoFluffJobs `/job/…`
     - Bulldogjob `/companies/jobs/…`
     - StepStone `/stellenangebote--…`

     Each pattern also gets a fixture negative, e.g. a search URL on the same host.
  3. **Keyword signals** (PL/EN, word-boundary, case-insensitive), with weighted points:
     - apply buttons: "Apply", "Aplikuj", "Apply now", "Aplikuj teraz"
     - section headings in `h1`–`h4`, `dt` and `strong`: "Requirements"/"Wymagania",
       "Responsibilities"/"Obowiązki"/"Zakres obowiązków", "We offer"/"Oferujemy",
       "Salary"/"Wynagrodzenie"/"Widełki"

     Detected only if `score ≥ KEYWORD_THRESHOLD` (initial value 6, tuned on fixtures in Stage 3).
  4. **Listing guard** (negative signal): many repeated ad cards/links on the page, such as ≥ 8
     links to job-offer URLs of the same preset, or ≥ 5 "Apply" buttons. This subtracts enough that
     keyword-only listing pages stay below the threshold. JSON-LD and URL-pattern detection are not
     affected, because listing pages don't match them.
- `content` side, in `job-ad.content.ts`:
  - **When to score:** on load; on DOM mutation (`MutationObserver`, debounced 750 ms, ignoring our
    own nodes) for lazily loaded ads; and on SPA navigation (URL polling every 1 s plus
    `popstate`/`hashchange`, because content scripts can't hook the page's `history.pushState`).
  - **What it sends:** `{ type: "job-ad-status", isJobAd, url }` to the background **only when the
    status or URL changes**.
- `badge.ts` (background): per tab,
  - `action.setBadgeText({ tabId, text: "CV" })`, with a background colour from the UX palette and
    an accessible title, e.g. "cv-snap: job ad detected".
  - The badge clears on a `false` status, on `tabs.onUpdated` (url/status `loading`) and on tab
    removal, so it can't go stale after navigating away.
  - Per-tab detection state is kept in `chrome.storage.session` (survives service-worker restarts).

**Story 004: extraction** (`extension/src/features/job-ad/`)
- `extract.ts`: `extractAd(document, url)` builds an `AdInput`.
  - **Clone first:** clone the document (`document.cloneNode(true)`), and on the **live** document
    mark hidden elements before cloning (computed style is only available live):
    - `display:none`, `visibility:hidden`, `hidden` attribute, `aria-hidden="true"`
    - zero size, or clipped/off-screen far outside the viewport (e.g. `left < -1000px`)
    - `opacity: 0`
    - `<template>`, `<noscript>`, `<script>`, `<style>`

    Marked elements are removed from the clone. Marking is through a `WeakSet` mapped to clone
    paths, so the page's DOM is never mutated.
  - **Read the text:** run `@mozilla/readability` on the clone. Fall back to the visible body text
    of `<main>` or `<article>` if Readability returns null or less than 200 characters.
  - **Order:** title first, then the main text with line breaks preserved.
  - **Cap:** truncated to `MAX_AD_CHARS` (50,000, from `shared`) with `TRUNCATION_MARKER`.
- `json-ld.ts`: `structuredFieldsFrom(document)` finds the `JobPosting` and returns
  `StructuredAdFields`:
  - `title`: `title`
  - `company`: `hiringOrganization.name`
  - `description`: `description` with HTML stripped to text, capped at
    `MAX_STRUCTURED_DESCRIPTION_CHARS`

  All three are validated with `StructuredAdFieldsSchema`, and `null` if absent.
- **Untrusted text:** no text is logged (privacy), and the text stays untrusted. The prompt
  builders already escape it.

**Story 005: manual selection** (`extension/src/features/job-ad/`)
- `capture.ts`: `captureAd(document, url, selection)`:
  1. If the selection text, trimmed, is not empty and is ≥ `MIN_SELECTION_CHARS` (200), it returns
     `{ ok: true, ad: { text, url, structuredFields: null, isManualSelection: true } }`.
     **The selection wins over automatic extraction.** Line breaks are preserved.
  2. If the selection is shorter than 200 characters, it returns
     `{ ok: false, reason: "SELECTION_TOO_SHORT" }`.
  3. If there's no selection and the page is detected, it returns the extracted `AdInput`.
  4. Otherwise it returns `{ ok: false, code: "JOB_AD_NOT_DETECTED", hint: "SELECT_AD_TEXT" }`.
- **Messaging:** background → content `{ type: "capture-job-ad" }` via
  `tabs.sendMessage(tabId, …)`. The content script replies with the capture result, validated
  with a zod schema on receipt. A background helper `captureFromTab(tabId)` handles three cases:
  - **No content script** (site not allowed): reply `SITE_NOT_ALLOWED`. The UI shows
    "Add this site" there.
  - **No answer** within 3 s: `JOB_AD_NOT_DETECTED`.
  - **Iframe ads:** not supported, so manual selection is the way (edge case).
- `shared` additions: `MIN_SELECTION_CHARS` and capture-result schemas, only if both extension
  contexts need them. Otherwise they stay in `extension/src/features/job-ad/messages.ts`. No new
  `ErrorCode`: "selection too short" is a UI reason, not an error crossing the native host.

### Dependencies

- Bolt 007: runtime-registered content script on granted origins only, `cvSnapDev` dev hook,
  presets.
- Bolt 005 contracts: `AdInput` (requirements-resolution.ts), `StructuredAdFieldsSchema`,
  `MAX_STRUCTURED_DESCRIPTION_CHARS`, `MAX_AD_CHARS`, `TRUNCATION_MARKER`, `adKeyFor` (selection
  hashing).
- `@mozilla/readability` **0.6.0**, the latest (Apache-2.0, no runtime dependencies), as an
  extension dependency. It runs in the content script on a cloned document.
- No new host permissions. The badge uses `action` (already declared) and `tabs.sendMessage` to
  granted tabs.

### Technical Approach

- **Pure core, thin glue:** scoring, JSON-LD reading, hidden-element filtering (given a style
  lookup), truncation and capture decisions are pure functions over a `Document`. Chrome APIs sit
  behind the `chrome-apis.ts` adapter from bolt 007, extended with `action` and `tabs.sendMessage`.
  The fakes in `fake-chrome.ts` are extended to match.
- **Tests** (Vitest + happy-dom; Readability on happy-dom DOMs; jsdom only if happy-dom proves
  incompatible):
  - synthetic HTML fixtures under `extension/test/fixtures/job-ads/`: ad pages with and without
    JSON-LD, PL and EN keyword-only ads, listing and search pages, hidden-injection pages
    (`display:none` "ignore previous instructions…"), oversized text, lazy-loaded DOM, and
    SPA-style URL changes
  - **plus the user's saved real pages** (below)
  - a threshold-tuning table in the test report: score per fixture, so it's visible how the
    threshold separates them
- **Manual Chrome check** (Stage 3):
  - On granted Pracuj.pl and Indeed pages, the badge appears on an ad and clears on a listing page
    and after in-app navigation.
  - `cvSnapDev` gets a capture command returning text length, title and source (never the full
    text in logs) for the active tab, with and without a selection.

### Real page fixtures (from the user, needed by Stage 3)

Save with Chrome "Save as… → Webpage, HTML only" (or Ctrl+S → HTML only), keeping the URL in the
file name or a sidecar `.url`. **Public ad pages only, no logged-in or personal pages.** Place them in
`exampleCV/job-pages/` (git-ignored; anonymized, trimmed copies may be committed later as
fixtures):
- 2 ad pages each from Pracuj.pl, justjoin.it, Indeed (pl or de) and StepStone, plus 1–2 from
  LinkedIn, NoFluffJobs and Bulldogjob if available (≈ 10–12 positives, at least 2 in English and
  2 in Polish, one German if possible)
- 1 search/listing page from each of the same boards (≈ 6 negatives)
- Optional: 1 ad on a non-preset company careers site (keyword-only detection)

These also seed bolt 006's regression set (it needs ≥ 20 ads), so the same saves can serve both.

### Acceptance Criteria

**Story 003-job-ad-detection**
- [ ] A page with `JobPosting` JSON-LD on an allowed site is detected and the badge is shown
- [ ] A URL matching a preset job-ad pattern is detected (per-preset test, plus a negative per
  host)
- [ ] Keyword-only pages are detected at or above the threshold, and not below it (threshold table
  in the test report)
- [ ] Job listing and search fixture pages are not detected
- [ ] Navigation away, including SPA route changes, clears or updates the badge; a lazily loaded ad
  is detected after debounced re-scoring

**Story 004-job-ad-text-extraction**
- [ ] Readability text of a detected ad includes the title, description and requirements sections
- [ ] `JobPosting` JSON-LD title, company and description are returned as `structuredFields`
- [ ] Text over 50,000 characters is truncated to 50,000 (+ marker)
- [ ] No detected ad and no selection → `JOB_AD_NOT_DETECTED`
- [ ] Hidden elements (`display:none`, `aria-hidden`, off-screen, …) never reach the captured text;
  the page DOM is not modified

**Story 005-manual-selection-fallback**
- [ ] A selection on an allowed page is used instead of automatic extraction
  (`isManualSelection: true`)
- [ ] A selection shorter than 200 characters gives `SELECTION_TOO_SHORT`, so the UI shows
  "selection too short"
- [ ] No selection and no detected ad → `JOB_AD_NOT_DETECTED` with the "select the ad text and try
  again" hint
- [ ] A selection spanning several elements keeps its line breaks

### User Decisions (2026-10-28T07:05:27Z)

- Decision bundle 1–6 approved.
- Indeed stays `https://*.indeed.com/*` only (decided in bolt 007; country sites are subdomains).
