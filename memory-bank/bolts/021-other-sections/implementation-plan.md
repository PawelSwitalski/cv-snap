---
stage: plan
bolt: 021-other-sections
created: 2026-11-02T21:05:00Z
---

## Implementation Plan: other-sections

### Objective

The tailoring plan can select profile "other sections" (courses, volunteering, …) that help for the
ad. The host's prompt asks for them and the validator rejects unknown IDs (retry with feedback);
the extension prints each selected section with its lines from the profile and drops other
sections first to fit two pages. Mixed extension and host versions keep working.

### Deliverables

**Shared (built into the host and the extension)**

- `shared/src/tailoring-plan.ts`: `otherSections: [{ profileId, title }]` with `title` nullable (a
  translated title, only when the CV language differs from the profile's), max
  `LIMITS.sectionItems`, `.default([])`.
  - Old host → new extension: the field is missing and parses as `[]`.
  - New host → old extension: zod strips the unknown key.
  - Claude: `z.toJSONSchema` (output mode) still lists every top-level property as required, so
    the existing JSON-schema tests hold.
- `shared/src/validation/plan-lines.ts`: new line kind `section`, line ID `otherSections[i]`; its
  text is the title (or empty) and it cites the section's profile ID. `applyLineChanges` passes
  `otherSections` through.
- `shared/src/validation/validate-plan.ts` (+ `types.ts`): for `section` lines only
  `UNKNOWN_SOURCE` runs. The title is a label like the headings, so it gets no fact rules. An
  unknown ID makes the line unverified, and the existing retry sends the feedback line
  (`otherSections[0]: cites an id that is not in the profile ("oth_9")`).
- `shared/src/prompts/tailor.ts`: one rule, added only when the profile has other sections: "you
  may select other sections that support the ad in `otherSections` by ID; give `title` only when
  translating; never more than the relevant ones".

**Extension**

- `cv-model.ts`: section key `other`. Each selected section becomes one section with the plan's
  title (or the profile title) and the profile's lines in `list` layout. It goes after the ranked
  sections and skills, before languages and certifications. Sections without lines, unknown IDs
  and duplicates are skipped. The entry is marked droppable-first (new optional `CvEntry` flag
  `dropFirst`).
- `headings.ts`: `other` needs no built-in heading (each section has its own title); widen the
  section key type.
- `fit-to-pages.ts`: steps of kind `section` come before every other step, last selected first,
  one whole section per step. `DroppedContent` kind `section`, reported with the section title.
- `ResultView.tsx` and `messages.json` (EN/PL): `result_dropped_section` ("$TITLE$ (whole
  section)").
- `CvPreview.tsx` and `CvDocument.tsx`: check that `list` sections with a per-section heading
  render as the other list sections do (no line markers: the lines come from the profile).

**Not in scope**: removing a single other section in the preview (the user can delete it from the
profile); validating the lines of other sections (they are profile text, printed verbatim).

### Dependencies

- Bolt 020 (drop plan, entry flags): done.
- Release: both packages go to 0.1.1 (Operations).

### Technical Approach

- Reuse the line machinery so the retry and feedback need no new path; the only rule for a
  `section` line is the citation check.
- Validation counts: a `section` line counts as verified when its ID is valid. Summary numbers
  may grow by the number of selected sections, which is acceptable: they are citations.
- Recorded fixtures: old recordings have no `otherSections`, so with the default they parse as
  before. The regression suite stays green without re-recording.

### Acceptance Criteria

- [ ] Plan with or without `otherSections` is valid; Claude's JSON schema keeps all top-level properties required
- [ ] Prompt mentions other sections only when the profile has some
- [ ] Unknown other-section ID → unverified line, `UNKNOWN_SOURCE` feedback; existing validator tests unchanged
- [ ] Selected sections are printed with the plan title or the profile title, profile lines, after skills and before languages; none when not selected
- [ ] Other sections are dropped first (last selected first, whole section) and reported
- [ ] Old-host plan (no field) and old recordings still work
- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm test` green
