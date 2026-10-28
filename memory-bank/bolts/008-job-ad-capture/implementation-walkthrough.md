---
stage: implement
bolt: 008-job-ad-capture
created: 2026-10-28T07:12:26Z
---

## Implementation Walkthrough: job-ad-capture (detection, extraction, manual selection)

### Summary

On allowed sites the content script now scores each page as a job ad and reports it, and the
background shows a "CV" badge per tab that clears on negative results, page loads and tab close.
On request the content script captures the ad: the user's selection if one is made (≥ 200
characters), otherwise the detected ad's readable text without hidden content, capped at 50,000
characters, with JSON-LD seed fields. The result is the `AdInput` that bolt 005's requirements
service consumes, or a typed reason for the UI.

### Structure Overview

Pure logic over a `Document` lives in `extension/src/features/job-ad/` (detection, JSON-LD, hidden
content filter, text conversion, extraction, capture decision, message schemas). Thin glue connects
it to the browser: a page watcher driven by the content script, a badge module and a capture helper
for the background, each behind small API interfaces so tests can use fakes. Nothing reaches the UI
yet beyond the badge; the Generate flow calls the capture helper in bolt 011.

### Completed Work

- [x] `extension/src/features/job-ad/url-patterns.ts` - job-ad URL pattern per preset board and a matcher
- [x] `extension/src/features/job-ad/json-ld.ts` - finds a schema.org JobPosting (object, array, @graph; invalid JSON ignored) and builds the structured seed fields within the shared limits
- [x] `extension/src/features/job-ad/detect.ts` - scoring: JSON-LD and URL patterns detect outright; PL/EN/DE apply-button and section-heading points against the threshold; listing-page penalty
- [x] `extension/src/features/job-ad/visible-content.ts` - finds hidden elements on the live page (display, visibility, opacity, clip, hidden/aria-hidden, zero-size, off-screen, non-content tags) and returns a clone without them
- [x] `extension/src/features/job-ad/text-from-html.ts` - plain text that keeps block structure as lines and list items as "- " lines
- [x] `extension/src/features/job-ad/extract.ts` - Readability on the hidden-content-free clone, `<main>`/`<article>`/body fallback, title first, 50,000-character cap with marker
- [x] `extension/src/features/job-ad/capture.ts` - selection first (≥ 200 characters), then the detected ad, otherwise "not detected" with the select-text hint
- [x] `extension/src/features/job-ad/messages.ts` - validated message and capture-result schemas, minimum selection length
- [x] `extension/src/features/job-ad/page-watcher.ts` - scores on start, after debounced DOM changes and on URL changes (polling, popstate, hashchange); sends status only when it changes
- [x] `extension/src/features/job-ad/badge.ts` - per-tab badge text, colour and accessible title; status kept in session storage
- [x] `extension/src/features/job-ad/capture-from-tab.ts` - asks a tab's content script to capture, with timeout, reply validation and "site not allowed" when no script answers
- [x] `extension/src/features/job-ad/browser-apis.ts` - real browser adapters for the badge and capture helpers
- [x] `extension/src/entrypoints/job-ad.content.ts` - starts the page watcher and answers capture requests
- [x] `extension/src/entrypoints/background.ts` - badge updates from validated status messages of own content scripts; clear on page load and tab close
- [x] `extension/package.json`, `pnpm-lock.yaml` - `@mozilla/readability` 0.6.0 and `zod`

### Key Decisions

- **Hidden content found live, removed from a clone**: computed style and layout exist only on the live page; matching by document order means the page DOM is never touched.
- **Layout checks only where layout exists**: zero-size and off-screen checks are skipped when the page reports no layout (test DOMs), so they never hide everything by mistake.
- **Readability gets its own copy**: it rewrites the document it is given; the fallback text comes from the untouched clean clone.
- **Status sent only on change**: avoids a message per DOM mutation on busy pages.
- **Badge state cleared on every page load**: the next content script reports again once scored, so a badge can't survive navigation away.
- **Background accepts status only from this extension's own content scripts in a tab**, validated with zod; capture replies are validated too.

### Deviations from Plan

- Capture failures use one shape, `{ ok: false, reason, hint? }`, with reasons `JOB_AD_NOT_DETECTED`, `SELECTION_TOO_SHORT`, `SITE_NOT_ALLOWED` (the plan sketched `code` for one of them). Still no new `ErrorCode`.
- Browser adapters for the badge and capture live in `job-ad/browser-apis.ts` instead of extending the allowed-sites adapter, so bolt 007's fakes and tests stay unchanged.
- German keywords (StepStone) added to the PL/EN keyword lists.
- `zod` added as a direct extension dependency (message validation; it was only transitive through `shared`).
- The badge colour is a placeholder accent (the UX guide defines no palette yet); the badge title is an English constant until UI localisation (story 005-tailored-cv-ui/001).
- The `cvSnapDev` capture command for the manual check is left for the test stage, as planned.

### Dependencies Added

- [x] `@mozilla/readability` 0.6.0 - readable main text of the ad (Apache-2.0, no runtime dependencies)
- [x] `zod` - validation of content-script ↔ background messages

### Developer Notes

- `action` and `storage.session` need no permission; the manifest still has no host permissions and no static content scripts.
- Iframe-embedded ads are not captured automatically; manual selection covers them.
- Page text is never logged; only status booleans and URLs travel to the background.
