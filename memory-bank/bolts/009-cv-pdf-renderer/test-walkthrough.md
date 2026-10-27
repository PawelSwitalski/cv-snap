---
stage: test
bolt: 009-cv-pdf-renderer
created: 2026-10-27T17:49:22Z
---

## Test Report: cv-pdf-renderer

### Summary

- **Tests**: 52/52 passed (7 files; `vitest run --project extension src/features/cv-pdf`)
- **Coverage**: 100% lines, 85.2% branches for `extension/src/features/cv-pdf/` (scoped run)

### Test Files

- [x] `extension/src/features/cv-pdf/cv-model.test.ts` - header and contact lines, optional photo, verbatim clause, section order, rank order, duplicate plan item kept once at best rank, unknown items skipped, section order follows best-ranked item, plan headings for other languages, determinism; date and range formatting (PL/EN "present", open range otherwise)
- [x] `extension/src/features/cv-pdf/headings.test.ts` - built-in PL/EN headings, plan headings for other languages, English fallback per missing/blank heading, "present" label
- [x] `extension/src/features/cv-pdf/file-name.test.ts` - `CV_First_Last_Company.pdf`, Polish transliteration incl. ł/Ł, middle names left out, company omitted or capped at 40 characters, only safe ASCII for hostile input (path separators, reserved characters), single names, letters NFKD can't decompose
- [x] `extension/src/features/cv-pdf/gdpr-clause.test.ts` - default mode "Polish ads only", always/never, text follows the output language, settings text returned verbatim, blank text prints nothing, default texts
- [x] `extension/src/features/cv-pdf/fit-to-pages.test.ts` - drop order (lowest rank first, bullets from the end before the item), never header/summary/skills/languages/certifications, pure application with drop report, empty sections removed, already-fitting CV untouched with one measurement, fewest drops, binary search bound, determinism, `fits: false` keeps header and clause
- [x] `extension/src/features/cv-pdf/render.test.tsx` - real react-pdf renders read back with pdf.js: A4 size, selectable text, Polish diacritics intact, letters intact across consecutive renders (regression), headings in the CV language, photo, page counting matches pdf.js, long CV fitted to ≤ 2 pages within 3 s with lowest-ranked content dropped and header, rank-1 item and clause kept, identical drops on repeat, no drops when it fits
- [x] `extension/src/features/cv-pdf/download.test.ts` - hidden anchor with file name, blob URL revoked after the click
- [x] `extension/test/cv-fixtures.ts` - synthetic data only (shared fixtures + a generated long CV)

### Acceptance Criteria Validation

- ✅ **CV PDF template**: A4, real (selectable) text, embedded font with every Polish letter extracted intact, optional photo, headings in the output language (built-in PL/EN; plan headings with English fallback otherwise)
- ✅ **Two-page fit**: at most 2 pages; lowest-ranked content dropped first (bullets before items); deterministic; dropped content reported; header, contact and clause never dropped
- ✅ **PDF download and naming**: ASCII-safe `CV_{FirstName}_{LastName}_{Company}.pdf`; download via anchor with the blob URL released afterwards
- ✅ **GDPR consent clause**: "Polish ads only" by default, always, never; verbatim settings text, never generated
- ✅ **Preview parity groundwork**: the PDF renders a pure `CvModel` that the preview (bolt 011) will reuse
- ✅ **Render + fit ≤ 3 s**: long CV (12 items × 6 bullets) fitted in ~0.8–0.9 s; single render ~80–90 ms (first ~160 ms)

### Issues Found

- **Text layer corrupted after earlier renders (fixed).** react-pdf reused parsed font objects between documents. After a render whose regular-weight text contained "Ó" but no plain "O", later PDFs lost or garbled "O" in the text layer: "RODO" extracted as "R@D@" or "D", in a fresh pdf.js process too. The page looked right, but copy-paste and ATS parsing got wrong text. The fit step renders the same CV several times per session, so this would hit real Polish CVs. Fix: `refreshCvFonts()` (fonts.ts) clears the parsed data and load promise of the CV font family before each render (`Font.reset()` doesn't reload; `Font.clear()` would drop react-pdf's fallback fonts). Cost: ~+0.5 s per full fit, still well under 3 s. Regression test fails without the fix and passes with it.
- **Contract change on merge with bolt 005 (fixed in the main session):** `JobRequirements.language` became nullable. `shouldIncludeClause`/`selectClause` now take `adLanguage: LanguageCode | null` plus the output language; "Polish ads only" uses the decided output language when the ad's language is undecidable (same fallback chain as the CV text). New test; 334/334 green after merge.
- Sample PDF (synthetic) reviewed by the user: layout approved (2026-10-27).
- Not a bug: the dropped-content report lists entries in document order, not drop order; the drop rule itself is verified.

### Notes

- Render tests run in a Node environment per file (`// @vitest-environment node`), using the same `renderCvPdf` code path as the extension.
- A synthetic sample (5 roles, Polish clause, 2 pages) was written outside the repo for a visual check: `<session scratchpad>/sample-cv.pdf`.
- Only scoped checks were run (the bolt 007 tests were being written in the same tree); the full-suite run happens after both test stages.
