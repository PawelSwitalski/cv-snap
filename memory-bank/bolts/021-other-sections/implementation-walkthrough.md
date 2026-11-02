---
stage: implement
bolt: 021-other-sections
created: 2026-11-02T21:40:00Z
---

## Implementation Walkthrough: other-sections

### Summary

The tailoring plan gained an optional list of selected other sections. The host's prompt asks for
the relevant ones, the validator checks their IDs (with the existing retry), and the extension
prints each selected section with its profile lines, dropping these sections first to fit two
pages.

### Structure Overview

Selected sections are plan "lines" of a new kind, so validation, feedback and the retry reuse the
existing path; for this kind only the citation rule runs. In the extension each section is its own
CV section (key `other`, list layout) marked to be dropped first; the fitter schedules those steps
before all others.

### Completed Work

- [x] `shared/src/tailoring-plan.ts` - `otherSections` (profile ID + optional translated title), default empty, so plans from older hosts parse
- [x] `shared/src/validation/types.ts` - line kind `section`, line ID `otherSections[n]`
- [x] `shared/src/validation/plan-lines.ts` - one line per selected section, citing its profile ID; line changes pass the field through
- [x] `shared/src/validation/validate-plan.ts` - only the citation check for section lines
- [x] `shared/src/prompts/tailor.ts` - other-sections rule, only when the profile has other sections
- [x] `extension/src/features/cv-pdf/cv-model.ts` - selected sections after skills, before languages; title from the plan or the profile; empty, unknown and repeated sections skipped; drop-first flag; `sectionKey` helper for unique React keys
- [x] `extension/src/features/cv-pdf/fit-to-pages.ts` - section steps first (last selected first, whole section), reported with the section title
- [x] `extension/src/features/cv-pdf/CvDocument.tsx`, `extension/src/features/generate/CvPreview.tsx` - unique section keys (several `other` sections)
- [x] `extension/src/features/generate/ResultView.tsx`, `extension/public/_locales/{en,pl}/messages.json` - `result_dropped_section`

### Key Decisions

- **Sections as validator lines**: unknown IDs get the same `UNKNOWN_SOURCE` feedback and retry as other lines, with no new code path in the host.
- **Default instead of optional**: the parsed type always has the list; Claude's JSON schema still lists every top-level property as required.
- **Lines printed verbatim from the profile**: no fact rules needed; only the title can be model text, and it is a label like the headings.

### Deviations from Plan

- `headings.ts` unchanged: the `other` key is added to the section type in `cv-model.ts` instead (other sections carry their own heading).

### Dependencies Added

- None

### Developer Notes

- The host must ship 0.1.1 for other sections to appear; with a 0.1.0 host the extension prints none.
- Recorded regression plans have no `otherSections`, so they parse as before; new live recordings will include it.
