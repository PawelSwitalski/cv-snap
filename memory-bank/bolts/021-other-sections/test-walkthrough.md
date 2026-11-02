---
stage: test
bolt: 021-other-sections
created: 2026-11-02T22:00:00Z
---

## Test Report: other-sections

### Summary

- **Tests**: 1162/1162 passed (1 skipped, as before); 15 new
- **Coverage**: not measured for this bolt
- `pnpm typecheck` and `pnpm lint` green; recorded regression plans (no `otherSections`) still pass

### Test Files

- [x] `shared/src/tailoring-plan.test.ts` - plan without the field parses as none selected; sections with and without a title; a section without a profile ID is rejected
- [x] `shared/src/validation/validate-plan.test.ts` - known section verified (no fact rules on the title); unknown ID unverified with `UNKNOWN_SOURCE` and the retry feedback line; same section twice accepted; removed section line left out; existing validator tests unchanged
- [x] `shared/src/prompts/prompt-builders.test.ts` - the other-sections rule appears only when the profile has other sections, with the output language
- [x] `shared/src/json-schema.test.ts` (existing) - every top-level plan property, now incl. `otherSections`, is required in Claude's JSON schema
- [x] `extension/src/features/cv-pdf/cv-model.test.ts` - no sections when none are selected; selected sections in plan order with the plan or profile title and profile lines, after skills and before languages; unknown, empty and repeated sections skipped, blank title falls back; unique section keys
- [x] `extension/src/features/cv-pdf/fit-to-pages.test.ts` - sections dropped first (last selected first); a whole section removed and reported by its heading
- [x] `extension/src/features/generate/GenerateView.test.tsx` - the "left out" list shows a dropped section

### Acceptance Criteria Validation

- ✅ **Plan with or without `otherSections` valid; schema keeps all properties required**: schema tests
- ✅ **Prompt mentions other sections only when the profile has some**: prompt tests
- ✅ **Unknown ID → unverified, `UNKNOWN_SOURCE` feedback; existing validator tests unchanged**: validator tests
- ✅ **Selected sections printed with title and profile lines, after skills, before languages; none when not selected**: model tests
- ✅ **Dropped first, last selected first, whole section, reported**: fit + UI tests
- ✅ **Old-host plans and old recordings still work**: schema default test + regression suite
- ✅ **lint, typecheck, test green**

### Issues Found

- None

### Notes

- Not run: `pnpm test:live` (needs Claude Code; would re-record plans). Whether the model actually selects relevant sections is checked in the 0.1.1 dev check: generate for an ad where a course or volunteering is relevant.
- PDF rendering of other sections uses the existing list layout (same as languages); checked visually in the dev check.
