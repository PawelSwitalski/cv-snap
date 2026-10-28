---
stage: test
bolt: 008-job-ad-capture
created: 2026-10-28T12:04:39Z
---

## Test Report: job-ad-capture (detection, extraction, manual selection)

### Summary

- **Tests**: 494/494 passed in the full suite (56 files); 83 new in this bolt, all in `extension/src/features/job-ad/`
- **Coverage**: not measured per package for the extension (coverage thresholds apply to shared/native-host); every job-ad module has a co-located test file
- **Real-page evaluation** (26 saved pages, local only, not committed): 22/22 ads detected, 0 false positives; requirements present in the captured text on 22/22 (was 5/22)
- **Manual Chrome check**: passed (user, 2026-10-28)

### Test Files

- [x] `extension/src/features/job-ad/url-patterns.test.ts` (23) - job-ad URL per preset (all 7, incl. Indeed subdomains and `jk=`), and negatives: search/listing URLs on the same boards, other boards, plain http
- [x] `extension/src/features/job-ad/json-ld.test.ts` (9) - JobPosting at top level, in arrays and `@graph`, `@type` arrays, malformed blocks skipped, company as object or string, field caps, inert description parsing (no script runs, no markup), line breaks kept
- [x] `extension/src/features/job-ad/detect.test.ts` (11) - hard detection (JSON-LD, URL pattern even with listing penalty), keyword scoring PL/EN/DE, "aplikuj szybko", single ad with repeated apply buttons and similar-offer links stays detected (tuned on real pages), listing pages not detected, guard from apply buttons alone, weak single signal, long "headings", ordinary pages
- [x] `extension/src/features/job-ad/extract.test.ts` (17) - hidden text excluded (display:none, visibility, opacity, `hidden`, aria-hidden, noscript, off-screen, zero-size overflow) incl. injected instructions; live page never modified; title first; JSON-LD description preferred; too-short description ignored; requirements outside the article recovered from the visible page; empty page; 50,000-char cap with marker; text helper skips script/style
- [x] `extension/src/features/job-ad/capture.test.ts` (6) - detected ad with structured fields; selection ≥ 200 wins (also on non-ad pages); short selection → `SELECTION_TOO_SHORT`; nothing detected → `JOB_AD_NOT_DETECTED` + hint; whitespace selection ignored
- [x] `extension/src/features/job-ad/messages.test.ts` (3) - status message, capture request and capture result validation (length cap, unknown reasons)
- [x] `extension/src/features/job-ad/page-watcher.test.ts` (6) - initial report, debounced DOM re-score with change-only messages, SPA navigation by URL polling, popstate/hashchange, stop
- [x] `extension/src/features/job-ad/badge.test.ts` (4) - "CV" + accessible title per tab, cleared on negative status, per-tab clearing, malformed stored state
- [x] `extension/src/features/job-ad/capture-from-tab.test.ts` (4) - validated reply, `SITE_NOT_ALLOWED` without a content script, malformed reply, timeout
- [x] `extension/test/job-ad-fixtures.ts` - synthetic ad and listing pages (no real pages in the repo)
- [x] `extension/src/entrypoints/sidepanel/dev-hook.ts` - dev-only `cvSnapDev.jobAd.capture()` / `status()` for the manual check (not in production builds)

### Acceptance Criteria Validation

**Story 003-job-ad-detection**
- ✅ **A JSON-LD JobPosting or a preset job-ad URL is always detected** (unit tests; 22/22 real ads have JSON-LD)
- ✅ **Keyword-only signals need the threshold; listing/search pages are not detected** (synthetic listing pages; threshold table below)
- ✅ **Badge appears on detected ads and clears on navigation away** (badge + page-watcher tests; real-browser part in the manual check)
- ✅ **No ad detected → `JOB_AD_NOT_DETECTED` with the manual-selection hint**

**Story 004-job-ad-text-extraction**
- ✅ **Extraction returns the ad text incl. title, description and requirements** (requirements on 22/22 real pages after the fix below)
- ✅ **Hidden elements stripped; injected hidden instructions never reach the output; page untouched**
- ✅ **Capped at 50,000 characters** (visible truncation marker)
- ✅ **structuredFields from JSON-LD match `StructuredAdFieldsSchema`**

**Story 005-manual-selection-fallback**
- ✅ **Selected text is used when present**
- ✅ **No selection and no ad → "select the ad text and try again" hint**
- ✅ **Selections under 200 characters are rejected** (`SELECTION_TOO_SHORT`, UI-only reason)

### Real-page evaluation (local, not committed)

Pages saved by the user in `exampleCV/job-pages/` (git-ignored). Only domains and numbers are recorded here.

| Group | Pages | Detected | Signal | Keyword score before → after tuning | Requirements in captured text before → after |
|---|---|---|---|---|---|
| theprotocol.it ads (not a preset) | 18 | 18 | JSON-LD | 1–5 → 7–8 (all ≥ 6) | 4/18 → 18/18 |
| justjoin.it ads | 3 | 3 | JSON-LD + URL pattern | −3/1/−3 → 3/7/3 | 1/3 → 3/3 |
| unidentified board ad (no canonical URL, links to justjoin.it) | 1 | 1 | JSON-LD | −3 → −3 (163 ad links, guard correct) | 0/1 → 1/1 |
| indeed.com search pages ("Java jobs") | 4 | 0 | none | 0 → 0 | n/a |

- Keyword-only detection (JSON-LD and URL ignored): 0/22 ads before tuning, 19/22 after; the 3 below the threshold are caught by JSON-LD/URL.
- Without JSON-LD (simulated), the captured text still contains the requirements on 22/22 pages.
- The Indeed pages are rendered client-side; their saved HTML has no result cards, so they don't exercise the listing guard (synthetic listing pages do).

### Issues Found

1. **Listing guard fired on real single ads** (all 22): ads repeat their apply button up to 5× (header, sticky bar, mobile, footer) and justjoin.it ads link up to 14 similar offers, so keyword detection could never succeed. Fixed: guard at ≥ 8 apply buttons or ≥ 15 job-ad links (constants exported, documented).
2. **Apply-button variant missed**: theprotocol.it uses "aplikuj szybko". Fixed (also "quick apply").
3. **Requirements dropped from the captured text** (17/22 real ads): Readability keeps one block when an ad's sections sit in sibling containers. Fixed: the body is the JSON-LD description when present (≥ 200 chars; it is already sent as `structuredFields`), else Readability only if it contains a requirements section, else the visible `<main>`/`<article>`, else the whole visible `<body>`. Readability options (`nbTopCandidates`, `charThreshold`) were tried and didn't help.
4. **Script/style text leaked into extracted text**: `textFromElement` included `<script>`/`<style>` content (e.g. inside a JSON-LD description). Fixed: skipped.

### Manual Chrome check (passed 2026-10-28, user)

1. `pnpm dev`; in that Chrome window allow justjoin.it (side panel → Inspect → Console: `await cvSnapDev.allowedSites.addPreset("justjoin")`).
2. Reload cv-snap in `chrome://extensions` (runtime-registered scripts aren't hot-reloaded).
3. Open a justjoin.it job offer → the toolbar icon shows the "CV" badge; hovering shows "cv-snap: job ad detected".
4. In the side-panel console: `await cvSnapDev.jobAd.status()` → `{ isJobAd: true, … }`; `await cvSnapDev.jobAd.capture()` → `{ ok: true, source: "auto", hasJsonLd: true, textLength: …, title: …, company: … }`.
5. Select ≥ 200 characters of the ad, run `capture()` again → `source: "selection"`; select a few words → `{ ok: false, reason: "SELECTION_TOO_SHORT" }`.
6. Go to the justjoin.it offer list (in-app navigation) → the badge disappears within ~1 s; `capture()` without a selection → `JOB_AD_NOT_DETECTED`.
7. On a site that isn't allowed, `capture()` → `SITE_NOT_ALLOWED`.

### Notes

- theprotocol.it is not one of the 7 presets; its ads are detected by JSON-LD, so adding it as a preset only needs the user's decision (and a URL pattern `/szczegoly/praca/`).
- Security: the JSON-LD description is not visible on the page; it was already sent as `structuredFields` (bolt 005), so preferring it as the body adds no new exposure. Prompt delimiting and the validator remain the defence.
- The real-page evaluation used a temporary test reading `exampleCV/job-pages/`; it was deleted and nothing from those pages was committed or quoted.

### Found during the manual Chrome check (2026-10-28T19:00:41Z)

- **Dev hook used the wrong window (fixed):** `cvSnapDev.jobAd.status()/capture()` looked up the tab with `lastFocusedWindow`; with the console focused that is the DevTools window (no tabs) → `NO_ACTIVE_TAB` / `null`. New `extension/src/lib/active-tab.ts` (`activeTabIdOfHostWindow`, 3 tests) takes the active tab of the window hosting the side panel; to be reused by the Generate flow (bolt 011).
- **Requirements cache key collided for offers shown under one URL (fixed, bolt 005 code):** justjoin.it showed the offer at `https://justjoin.it/`, and the cache key was the URL alone, so different offers there would have reused one cached requirements entry for 7 days. `adKeyFor` now takes `{ kind: "page" | "selection", text }` and appends a SHA-256 fingerprint (JSON-LD description when present, else extracted text); the text never enters the key. 4 new tests (3 shared, 1 service). Suite 523/523.
- Manual check so far: justjoin.it granted; detection `isJobAd: true`; capture ok (source auto, JSON-LD present, 2,120 chars, title and company correct).
- Manual check completed (2026-10-28T19:08:23Z): manual selection ≥ 200 chars → source "selection", short selection → SELECTION_TOO_SHORT; "CV" badge shown on the offer and cleared off it. Passed.
- User decision: theprotocol.it added as the 8th preset (`https://theprotocol.it/*`, job-ad URL `/szczegoly/praca/<slug>`; 18/22 saved ads came from it), with positive and listing-page negative URL tests.
