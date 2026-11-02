---
intent: 003-complete-cv-content
phase: inception
status: complete
created: '2026-11-02T18:30:00Z'
updated: '2026-11-02T18:45:00Z'
---

# Requirements: Complete CV Content

## Intent Overview

Defect fix for 0.1.0, shipped as 0.1.1. The tailored CV loses content the user's profile has:

- **Education** mostly disappears. Education is printed only when the model puts it in
  `plan.items`; it rarely matches the ad's must-haves, so it is often left out, and when it is
  included it usually ranks last and is the first item dropped to fit two pages (FR-14 of intent
  001, `fit-to-pages.ts`). Languages and certifications don't have this problem: they are printed
  straight from the profile.
- **Skills** go missing: the model lists only the skills it finds relevant, the rest are lost.
- **Other sections** (courses, volunteering, hobbies, …) are never printed: `buildCvModel` has no
  case for them.

## Business Goals

| Goal | Success Metric | Priority |
|------|----------------|----------|
| The CV shows the person's education | Every education entry of the profile is in every generated CV | Must |
| No skill silently lost | Every profile skill is in the CV unless dropped to fit two pages and reported | Must |
| Other sections usable | Relevant other sections appear in the CV | Should |

---

## Functional Requirements

### FR-1: Education is always printed

- **Description**: Every education entry of the profile is printed in the tailored CV (school,
  degree / field, dates), whether or not the plan lists it. The plan may re-order education
  entries and supply their bullets; an entry the plan does not mention is printed with its profile
  bullets unchanged.
- **Acceptance Criteria**:
  - A profile with N education entries gives a CV model with N education entries, for any plan
    (including a plan with no education items).
  - Education entries are never dropped by the two-page fit; only their bullets can be dropped,
    and dropped bullets are reported to the user like other dropped content.
  - The education section's position in the CV stays as today (ordered by its best-ranked entry);
    with no plan entry it goes after experience and projects.
- **Priority**: Must

### FR-2: All skills are printed, relevant ones first

- **Description**: The skills the plan selects are printed first, in plan order; the remaining
  profile skills follow in profile order. Skills are never re-phrased beyond what the plan gives.
- **Acceptance Criteria**:
  - Every profile skill appears exactly once in the CV model (no duplicates by ID).
  - If the CV still exceeds two pages after all ranked bullets and items are dropped, the
    non-selected skills are dropped from the end and reported; selected skills are never dropped.
- **Priority**: Must

### FR-3: Other sections can be printed

- **Description**: The plan may select profile "other sections" (by ID) that help for the ad; each
  selected section is printed with its own title and its lines. Non-selected other sections are
  not printed.
- **Acceptance Criteria**:
  - The tailoring prompt tells the model it may select other sections and how to cite them.
  - A selected other section appears in the CV with the profile's title (headings are not
    translated by the template; the model gives the title in the output language if it differs).
  - Other sections are the first content dropped to fit two pages (before any ranked bullet), and
    dropping is reported.
  - The plan schema stays backwards compatible: a plan without other sections is valid.
- **Priority**: Should

### FR-4: Fact validation still holds

- **Description**: The source-facts validator covers the new content: other-section lines and
  education bullets printed from the profile are trusted profile facts; plan-written lines still
  need citations as today.
- **Acceptance Criteria**:
  - Existing validator tests pass unchanged.
  - New tests: a plan citing an unknown other-section ID is rejected with feedback, as for other
    unknown IDs.
- **Priority**: Must

### FR-5: Regression coverage

- **Description**: Tests lock in the fix.
- **Acceptance Criteria**:
  - Unit tests for `buildCvModel` and the fit-to-pages drop order cover FR-1 to FR-3.
  - The live regression set (`pnpm test:live`) gets a check that every education entry of each
    fixture profile is in the CV model.
- **Priority**: Must

---

## Non-Functional Requirements

### Performance

| Requirement | Metric | Target |
|-------------|--------|--------|
| Generation time | Wall time vs 0.1.0 on the regression fixtures | No more than +10% |

### Reliability

| Requirement | Metric | Target |
|-------------|--------|--------|
| Two-page limit | Generated PDFs over 2 pages | 0 (FR-14 of intent 001 still holds) |

---

## Constraints

### Technical Constraints

**Project-wide standards**: loaded from `memory-bank/standards/` by the Construction Agent.

**Intent-specific constraints**:

- No change to the stored profile format; existing profiles keep working without migration.
- Released as 0.1.1 of **both** packages: the tailoring prompt is built in the host
  (`native-host/src/host-main.ts` uses `promptBuilders` from `shared/`), so FR-3 changes the host.
- Mixed versions must keep working (users update the extension and the host separately): a 0.1.1
  extension with a 0.1.0 host gets plans without other sections (FR-1 and FR-2 still apply); a
  0.1.0 extension ignores the new plan field (zod strips unknown keys).

### Business Constraints

- Ship before intents 004 (history) and 005 (CV layout), so the fix reaches users quickly.

---

## Assumptions

| Assumption | Risk if Invalid | Mitigation |
|------------|-----------------|------------|
| Always printing education still fits two pages for typical profiles | More content is dropped elsewhere | Education bullets can be dropped; drops are reported |
| Model follows the "other sections" instruction | Sections never selected | Live regression fixture with a relevant other section |

---

## Open Questions

| Question | Owner | Due Date | Resolution |
|----------|-------|----------|------------|
| Does the tailoring prompt run in the host or the extension (decides whether the host needs 0.1.1)? | Inception Agent | 2026-11-02 | Resolved: host, so both packages ship 0.1.1 |
