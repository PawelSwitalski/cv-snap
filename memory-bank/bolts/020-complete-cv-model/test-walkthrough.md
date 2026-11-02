---
stage: test
bolt: 020-complete-cv-model
created: 2026-11-02T20:40:00Z
---

## Test Report: complete-cv-model

### Summary

- **Tests**: 1147/1147 passed (1 skipped, as before); 63 new: 15 unit/UI tests and 48 recorded-plan cases
- **Coverage**: not measured for this bolt (`pnpm test:coverage` unchanged in scope)
- `pnpm typecheck` and `pnpm lint` green

### Test Files

- [x] `extension/src/features/cv-pdf/cv-model.test.ts` - education: all entries printed with profile bullets, plan entries first with plan bullets, section after experience and projects, no section without education, repeated plan item once; skills: plan first then profile order, all when the plan has none, no duplicate by name, removed skills left out, no section without skills; section-order expectation updated (it asserted the bug)
- [x] `extension/src/features/cv-pdf/fit-to-pages.test.ts` - drop order (unplanned education bullets first, no step that drops an education entry, profile skills last from the end); planned education keeps the entry; dropped skills reported by name, plan skills kept; education kept when the CV can't reach two pages
- [x] `extension/src/features/cv-pdf/cv-model.regression.test.ts` - new: every recorded plan of every regression set keeps every education entry and every profile skill (48 plans locally: synthetic + git-ignored real sets; 2 in CI: synthetic only)
- [x] `extension/src/features/generate/preview-model.test.ts` - a skill removed in the preview doesn't come back from the profile
- [x] `extension/src/features/generate/GenerateView.test.tsx` - the "left out" list shows a dropped skill
- [x] `shared/test/fixtures/regression/synthetic/cvs/cv-pl.{txt,profile.json}` - second school (with a bullet); the CV text gained the education section it was missing

### Acceptance Criteria Validation

- ✅ **N education entries → N in the model, for any plan**: unit tests + regression test
- ✅ **Planned education keeps plan order and bullets; the rest follow with profile bullets**: unit test
- ✅ **No plan education → after experience and projects**: unit test
- ✅ **Fit never drops an education entry, may drop its bullets, reports them**: fit tests
- ✅ **Skills: plan first, then every non-cited profile skill once**: unit tests + regression test
- ✅ **Profile skills dropped last, from the end, reported; plan skills never dropped**: fit tests + UI test
- ✅ **Recorded-plan regression check**: fails on 35 of 48 recorded plans without the fix, passes with it
- ✅ **Fixture with ≥ 2 education entries and an ad without education**: synthetic set (committed) and real sets cv-01, cv-02, cv-03 (local)
- ✅ **lint, typecheck, test green**

### Issues Found

- The synthetic CV text had no education section although its profile had one (fixed with the second school).

### Notes

- NFR generation time: no prompt or host change, so model time is unchanged; the fit may need one or two more render passes for longer CVs (binary search).
- Manual check in Chrome (dev build): generate a CV for an ad that doesn't mention education and see both schools and all skills. Planned for the 0.1.1 dev check after bolt 021.
