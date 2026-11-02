---
stage: plan
bolt: 020-complete-cv-model
created: 2026-11-02T19:15:00Z
---

## Implementation Plan: complete-cv-model

### Objective

Every education entry and every profile skill reaches the tailored CV (preview and PDF). Education
entries are never dropped to fit two pages; non-selected skills are dropped only after everything
else that can be dropped. Extension only: no host, prompt or schema change.

### Cause (confirmed on the recorded plans)

- `buildCvModel` prints education only for plan items, and skills only from `plan.skills`.
  Languages and certifications are printed straight from the profile, which is why they never go
  missing.
- Recorded fixtures (git-ignored real sets, plus synthetic): the plan leaves out some education in
  **15 of 17** `real` cases with education, **3** `real-sonnet` cases and both synthetic cases; up to
  16 of 26 skills are left out.
- When education is in the plan it usually has the highest rank number, so `planDropSteps` drops it
  first.

### Deliverables

- `extension/src/features/cv-pdf/cv-model.ts`
  - `CvEntry` gains `pinned: boolean` (the entry itself is never dropped; its bullets can be) and
    `fixedBullets: number` (how many leading bullets are never dropped, used by the skills entry).
  - Education: plan-ranked entries first (plan rank order, plan bullets), then every other profile
    entry in profile order with its profile bullets and `rank: null`; all `pinned`. With no plan
    education item, the section goes after the other ranked sections.
  - Skills: plan skills in plan order, then every profile skill not cited by any plan skill's
    `sourceIds`, in profile order; `fixedBullets` = number of plan skills.
- `extension/src/features/cv-pdf/fit-to-pages.ts`
  - Drop order: (1) ranked entries as today, unranked (`rank: null`) education entries treated as
    least relevant: bullets from the end, then the entry unless `pinned`; (2) then non-selected
    skills from the end, one per step, never below `fixedBullets`.
  - `DropStep` and `DroppedContent` gain kind `skill`.
- `extension/src/features/generate/ResultView.tsx` + `extension/public/_locales/{en,pl}/messages.json`:
  dropped-skill line (`result_dropped_skill`).
- Preview markers: profile bullets of non-planned education entries print as normal text (no
  verification marker); check the preview code path that maps plan bullets to markers.
- Tests (stage 3):
  - `cv-model.test.ts`, `fit-to-pages.test.ts`: the acceptance criteria of stories 001 and 002.
  - New `extension/src/features/cv-pdf/cv-model.regression.test.ts` (story 003): for every recorded
    case in every available regression set (`shared/test/fixtures/regression/*`, read through the
    shared fixture repository), the CV model contains every education entry and every skill of the
    profile. Runs in `pnpm test` on the recordings; `pnpm test:live` records new plans, so the same
    check covers live runs.
  - Synthetic set: profile has 1 education entry and the recorded plans omit it, so the committed
    fixture already covers "ad doesn't mention education". Add a second education entry to the
    synthetic profile only if that keeps the recordings valid (else note it).

### Dependencies

- None outside the extension. Reads shared regression fixtures in a test only.

### Technical Approach

- Keep `buildCvModel` pure and deterministic; ordering rules live there, dropping rules in
  `fit-to-pages.ts`, driven by the two new entry fields (no special-casing by section key in the
  fitter).
- Existing entries: experience/projects `pinned: false`, `fixedBullets: 0`; summary, languages,
  certifications stay outside the drop plan (layout not `entries`), skills joins it only through
  `fixedBullets`.
- Dropped content labels follow the existing EN/PL message pattern.

### Acceptance Criteria

- [ ] Profile with N education entries → N education entries in the model, for any plan (incl. none)
- [ ] Planned education keeps plan order and bullets; the rest follow in profile order with profile bullets
- [ ] No plan education → education section after experience and projects
- [ ] Fit never drops an education entry; may drop its bullets; dropped bullets are reported
- [ ] Skills: plan skills first, then every non-cited profile skill once, profile order
- [ ] Non-selected skills dropped only after all ranked steps, from the end, reported; selected skills never dropped
- [ ] Recorded-plan regression test: every education entry and skill in the model for every case
- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm test` green
