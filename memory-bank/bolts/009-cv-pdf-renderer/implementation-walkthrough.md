---
stage: implement
bolt: 009-cv-pdf-renderer
created: 2026-10-25T20:31:46Z
---

## Implementation Walkthrough: cv-pdf-renderer

### Summary

The extension can now turn a tailoring plan and the confirmed profile into a one-template A4 CV PDF
with `@react-pdf/renderer`, fit it to at most two pages by dropping the lowest-ranked content,
name it ASCII-safely and download it. The GDPR clause is printed verbatim from settings according
to its mode. Embedded Noto Sans fonts make Polish letters render and extract correctly. A temporary
render smoke run (removed again) produced a one-page CV in about 0.25 s and fitted a three-page CV to
two pages in about 0.34 s.

### Structure Overview

A pure core builds a render-ready `CvModel` from profile + plan (the same model will feed the
side-panel preview in bolt 011), decides headings, the clause, the drop order and the file name.
A thin rendering layer turns the model into a PDF and measures its page count; fitting combines
the two by binary search over the drop order. All code lives in the extension; no PDF crosses
native messaging.

### Completed Work

- [x] `extension/src/features/cv-pdf/cv-model.ts` - builds the render-ready CV model: header/contact/photo, summary, ranked item sections in order of relevance, skills, languages, certifications, clause; dates formatted per output language
- [x] `extension/src/features/cv-pdf/headings.ts` - built-in PL/EN section headings; plan headings for other languages with English fallback; "present" label per language
- [x] `extension/src/features/cv-pdf/fit-to-pages.ts` - deterministic drop order (lowest rank first, bullets from the end before the item), pure application of drops with a dropped-content report, binary-search fitting with an injected page measure
- [x] `extension/src/features/cv-pdf/CvDocument.tsx` - the A4 template component (header with optional photo, sections, bullets, clause); real text only; best-effort right alignment for RTL languages
- [x] `extension/src/features/cv-pdf/render.tsx` - renders the model to a PDF blob, counts pages, fits then renders the final PDF
- [x] `extension/src/features/cv-pdf/fonts.ts` - registers the embedded Noto Sans family once (regular, bold, italic) and disables hyphenation
- [x] `extension/src/features/cv-pdf/file-name.ts` - `CV_{First}_{Last}_{Company}.pdf`, ASCII transliteration including ł/ø/ß/đ/æ/œ/þ, company truncated to 40 characters or omitted
- [x] `extension/src/features/cv-pdf/download.ts` - blob URL + anchor download from the side panel, URL revoked afterwards
- [x] `extension/src/features/cv-pdf/gdpr-clause.ts` - clause modes, default mode and default PL/EN texts, inclusion rule (by ad language), verbatim text selection (by output language)
- [x] `extension/public/fonts/NotoSans-Regular.ttf`, `NotoSans-Bold.ttf`, `NotoSans-Italic.ttf`, `OFL.txt` - embedded font files (static TTF, ~1.9 MB total) and their licence
- [x] `shared/package.json` - `prepare` script so `shared` is built during `pnpm install`, before the extension's `wxt prepare` needs it

### Key Decisions

- **One model for PDF and preview**: `CvModel` holds every visible string, so the preview (bolt 011) can't drift from the downloaded PDF (FR-13).
- **Drop order per item, lowest rank first**: an item loses its bullets from the end before the item itself goes; top-ranked items are never stripped to save a lower-ranked one.
- **Binary search over the drop order**: each check is a full render; page count only shrinks as content is removed, so ~log₂(steps) renders find the smallest drop.
- **Clause is part of the measured model**: its space is reserved before fitting, so it can't push the CV to page 3.
- **Clause inclusion follows the ad, clause text follows the CV language**: "Polish ads only" checks the ad's language; a Polish CV gets the Polish text, other languages the English text, both verbatim from settings.
- **Repeated plan items printed once**: a plan that cites the same profile item twice keeps only its best-ranked copy (avoids duplicate sections and ambiguous drops).
- **Numeric dates**: `03/2021` style is language-neutral; only the "present" word is localized (PL/EN), other languages get an open range.

### Deviations from Plan

- `shared/package.json` gained a `prepare` script (not in the plan): a fresh `pnpm install` failed because the extension's `wxt prepare` loads `wxt.config.ts`, which imports `@cv-snap/shared` before it was built (latent since bolt 003). This restores the "fresh clone → install → build" path.
- Repeated plan items are de-duplicated in the model (found during the render smoke run).
- Fonts are vendored from the official Noto distribution (static hinted TTF) rather than an npm package, as planned; subsets are the full Latin/Greek/Cyrillic coverage of Noto Sans.

### Dependencies Added

- [x] `@react-pdf/renderer` 4.9.0 (extension) - PDF rendering from React components
- [x] `pdfjs-dist` 6.4.299 (extension, dev) - reading rendered PDFs in tests (text, diacritics, pages)

### Developer Notes

- Fonts must be registered before rendering: in the extension with `browser.runtime.getURL("/fonts/…")`, in Node tests with file paths (`registerCvFonts`).
- Page counting reads react-pdf's uncompressed page dictionaries; tests should also cross-check with pdf.js.
- React warns about duplicate keys if a model contains two entries with the same id; `buildCvModel` prevents that for plan items.
- Font sources: `https://raw.githubusercontent.com/notofonts/notofonts.github.io/main/fonts/NotoSans/hinted/ttf/NotoSans-{Regular,Bold,Italic}.ttf`; licence: `https://raw.githubusercontent.com/notofonts/latin-greek-cyrillic/main/OFL.txt`.
