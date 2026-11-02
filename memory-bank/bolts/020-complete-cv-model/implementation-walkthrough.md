---
stage: implement
bolt: 020-complete-cv-model
created: 2026-11-02T20:10:00Z
---

## Implementation Walkthrough: complete-cv-model

### Summary

The CV model now prints every education entry and every profile skill, whatever the tailoring plan
selects. The two-page fit never removes an education entry (only its bullets) and removes the
profile skills the plan didn't select last, after all ranked content. Extension only.

### Structure Overview

Ordering stays in the pure model builder; dropping stays in the fitter. Two optional entry fields
connect them: "pinned" (the entry is never dropped) and "fixed bullets" (how many leading bullets,
the plan's skills, are never dropped). The fitter reads only these fields, never section keys.

### Completed Work

- [x] `extension/src/features/cv-pdf/cv-model.ts` - education: plan entries first, then every other profile entry with its profile bullets (unranked), all pinned; the section goes after the other ranked sections when the plan has none. Skills: plan skills, then every profile skill not cited (by ID) or already printed (by name); a new option leaves out skills the user removed in the preview
- [x] `extension/src/features/cv-pdf/fit-to-pages.ts` - drop plan: unranked education bullets first, pinned entries kept, then profile skills from the end; new step and dropped-content kind `skill`
- [x] `extension/src/features/generate/preview-model.ts` - passes the profile skills of removed plan skill lines to the model builder, so a removed skill doesn't come back from the profile
- [x] `extension/src/features/generate/ResultView.tsx` - dropped-skill line in the "left out" list
- [x] `extension/public/_locales/{en,pl}/messages.json` - `result_dropped_skill`
- [x] `extension/src/features/cv-pdf/cv-model.test.ts` - section-order expectation updated: it asserted the bug (no education when the plan has none)

### Key Decisions

- **Optional entry fields**: existing entry literals (tests, preview) stay valid; unset means today's behavior.
- **Skills also matched by name**: recorded plans sometimes cite an experience item for a skill instead of the skill's ID; matching by name (case-insensitive) avoids printing it twice.
- **Unranked education is least relevant**: its bullets are the first content dropped, but the entry stays.
- **Profile lines are plain text in the preview**: they have no plan line ID, so they get no verification marker and no edit/remove action (same as languages and certifications).

### Deviations from Plan

- `CvEntry` fields are optional (`pinned?`, `fixedBullets?`) rather than required.
- Added name matching for skills and the removed-skill option in the preview (not in the plan; found while implementing).

### Dependencies Added

- None

### Developer Notes

- Profile skills added after the plan's skills can't be removed in the preview; they can be deleted from the profile.
- Bolt 021 adds other sections to the same drop plan (dropped first).
