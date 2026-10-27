---
stage: plan
bolt: 009-cv-pdf-renderer
created: 2026-10-25T20:13:47Z
---

## Implementation Plan: cv-pdf-renderer

### Objective

Render a validated `TailoringPlan` + `CvProfile` into one cv-snap A4 CV (max 2 pages) with
`@react-pdf/renderer`, entirely inside the extension: localized headings, optional photo,
selectable text with correct Polish diacritics, deterministic two-page fitting by rank,
ASCII-safe file naming and download, and the GDPR consent clause (klauzula RODO) taken verbatim
from settings. No PDF ever crosses native messaging.

### Deliverables

**Story 001: CV PDF template** (`extension/src/features/cv-pdf/`)
- `CvDocument.tsx`: A4 `Document`/`Page` tree. Sections in plan order:
  - header (name, headline, contact, photo)
  - summary
  - experience/projects/education items in `rank` order, with each item's plan bullets
  - skills (plan selection)
  - languages and certifications (profile)
  - footer clause
- `headings.ts`: built-in PL/EN section headings. Other languages use `plan.headings` and fall back to EN per missing heading.
- `fonts.ts`: registers embedded fonts (Noto Sans regular/bold/italic, Latin + Latin Extended + Cyrillic + Greek subsets) via `Font.register`, with hyphenation disabled. A fallback-family hook for other scripts is best effort (RTL text direction is best effort, per the story).
- Photo: `Image` from the IndexedDB blob, passed in as a data URL. Without a photo the header reflows with no gap.
- Data shaping as a pure `buildCvModel(profile, plan, options)`:
  - joins plan items to profile items (title, company, dates formatted per language)
  - keeps user-kept unverified lines as normal text (markers are preview-only)
  - the same model feeds the preview (FR-13 parity)

**Story 002: two-page fit** (`fit-to-pages.ts`)
- `fitToTwoPages(model, measure)`: returns `{ model, dropped[] }`.
- Order of removal:
  - drop bullets before whole items, lowest rank first
  - inside an item, drop bullets from the end
  - never drop the header, contact or clause
  - a single item longer than a page has its bullets trimmed
- `measure` = a render-pass page count (`renderToBuffer` → count `/Type /Page`), injected so tests stay pure.
- Deterministic: there's no randomness or time dependence, and ties break by rank, then plan order.
- Clause space is reserved before fitting, because the clause is part of the measured model.

**Story 003: download and naming** (`file-name.ts`, `download.ts`)
- `buildCvFileName(contact.fullName, requirements.company)` produces `CV_{First}_{Last}_{Company}.pdf`:
  - NFKD transliteration, plus an explicit map for ł/Ł, ø, ß and đ
  - non-alphanumerics become `_`, and repeated underscores collapse to one
  - the company part is truncated to 40 characters, or omitted when null
- `downloadPdf(blob, name)`: blob URL plus an anchor click from the side panel, then the URL is revoked.

**Story 004: GDPR clause** (`gdpr-clause.ts`)
- `GdprClauseMode = "polishAdsOnly" | "always" | "never"` (default `polishAdsOnly`). `shouldIncludeClause(mode, adLanguage)` decides.
- `DEFAULT_GDPR_CLAUSE_PL` / `_EN` constants are the default settings text.
- The renderer only prints the string it receives, verbatim, so Claude never produces it.
- The editing UI belongs to bolt 012.

### Dependencies

- Bolt 002 contracts: `CvProfileSchema`, `TailoringPlanSchema`, `JobRequirements.company/language`.
- `@react-pdf/renderer` 4.9.0. Its peer dependency is React `^19` (React 19.3 is OK). It bundles pdfkit 0.20.1.
- Embedded font, Noto Sans (OFL-1.1). Static TTF files are vendored into `extension/public/fonts/`, with the licence file next to them. `@fontsource/noto-sans` 5.3.0 (OFL) ships WOFF/WOFF2 only, so vendored TTF is preferred for pdfkit/fontkit reliability.
- Settings storage (bolt 012) supplies the clause mode and text. The defaults are defined here.

### Technical Approach

- **Rendering runs only in the extension.** Code lives in `extension/src/features/cv-pdf/`, and the preview (bolt 011) consumes the same `CvModel`.
- **Pure core, thin rendering.** `buildCvModel`, `fitToTwoPages` (with a fake measurer), `buildCvFileName` and `shouldIncludeClause` are pure and unit-tested.
- **Real rendering in tests.** Integration tests call `renderToBuffer` in the Vitest node environment, then check:
  - the page count
  - text presence and order, via pdfjs-dist (already in native-host) as a test-only dependency
  - that text is selectable, with Polish diacritics round-tripping (ą ć ę ł ń ó ś ź ż)
- **Synthetic data only.** Fixtures come from `shared/test/fixtures` plus generated long profiles for overflow cases. `exampleCV/` is never used.
- **Performance.** Fitting re-renders. Instead of dropping one by one, it uses a binary search over the ordered drop list to keep within FR-14's ≤ 3 s p95, while staying deterministic.

### Acceptance Criteria

- [ ] **Sections:** the PDF contains the header/contact, summary, experience, skills, education and other included sections, in plan order.
- [ ] **Photo:** shown in the header when present; with no photo, there's no layout gap.
- [ ] **Headings:** built-in for PL/EN, and the plan's headings for other languages.
- [ ] **Text:** selectable, and Polish diacritics extract correctly.
- [ ] **Unverified lines** the user kept render as normal text.
- [ ] **Two-page fit:** content over 2 pages is reduced to ≤ 2 by dropping bullets, then items, lowest rank first, and the dropped list is returned.
  - Content of ≤ 2 pages is unchanged.
  - The same input gives an identical result.
- [ ] **File name:** `CV_{First}_{Last}_{Company}.pdf`, ASCII only (for example `Łukasz Żółć` → `Lukasz_Zolc`).
  - The company part is omitted when there's no company, and truncated to 40 characters.
- [ ] **GDPR clause:**
  - Default mode: included for a Polish ad, excluded otherwise.
  - `always` and `never` are honoured.
  - The text is verbatim from settings.
- [ ] **Edge cases:** long company names wrap without overflow, and the clause never pushes the CV to page 3.

### User Decisions (2026-10-25T20:25:48Z)

- Decision bundle 1–5 approved.
- Committing the Noto Sans TTF files (~1–2 MB, OFL-1.1, licence file alongside) is approved.
