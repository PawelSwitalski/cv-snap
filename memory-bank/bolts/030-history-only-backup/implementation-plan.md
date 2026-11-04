---
stage: plan
bolt: 030-history-only-backup
created: 2026-11-04T19:15:00Z
---

## Implementation Plan: 002-history-only-mode (bolt 030)

### Objective

Users in history-only mode can back up and restore their history without a profile. The
privacy texts say that an own CV can be stored and that history-only mode sends nothing to
Claude. A browser test proves the no-helper path end to end, with no host registered.

### Decisions (proposed; accept or adjust)

1. **No profile in the file means no `profile` field.** Such a file must hold history; one with
   neither is refused as invalid. 0.2.0 refuses a profile-less file as invalid (its schema needs
   a profile); this goes in the release notes. Files with a profile are unchanged.
2. **The stored CV (`cv-original`) is not in the backup**, as in 0.1.x and 0.2.0. After importing
   on a new PC, Save my CV offers Choose another PDF until the user adds their CV (Settings → Your
   CV → Replace…). Every saved entry still has its own PDF. Alternative: add the stored CV to
   profile-less backups (about +1.33 × the CV size).
3. **The privacy notice stays at version 2; only the text changes.** Nothing new is sent anywhere,
   and an own CV is the same kind of data as a downloaded one, kept in the same place. Changing
   "The CVs you download…" to "The CVs you download or save…" doesn't need everyone to
   acknowledge the notice again.

### Deliverables

1. **Backup format** (`features/profile/backup.ts`, story 004)
   - `buildBackupFile(profile | null, …)`: without a profile, it writes the envelope with no
     `profile` and no photo, plus the history (which is required).
   - `parseBackup` → `profile: CvProfile | null`. A missing profile with history is ok; missing
     with no history (or empty history) is `INVALID`. Everything else is unchanged.
2. **Backup in Settings** (`features/settings/BackupSection.tsx`)
   - Export works without a profile when the history has entries (history-only mode). The
     "Include history" checkbox is then forced on, and the photo option is hidden.
   - Import:
     - with a profile → as today (confirm "Replace your profile?"), and the panel leaves
       history-only mode (bolt 029 already clears the flag once a profile exists);
     - without a profile → a confirm that only mentions the history ("CVs from the history to
       add or update: N"), merge, prune, and the profile left as it is. On a clean browser with
       no profile, the panel switches to history-only mode (new `onHistoryOnlyImported` callback
       → sets the flag).
   - "Confirm a profile first to export it" is shown only when there is neither a profile nor
     a history.
3. **Privacy texts** (story 005)
   - `privacy_point_history` (en/pl): "The CVs you download or save, …".
   - `docs/privacy/index.md`, `pl.md`: an own CV saved to History is stored like a downloaded
     one; in history-only mode cv-snap uses no helper and sends nothing to Claude or anywhere
     else; a backup may hold only the history.
4. **E2E** (story 006)
   - Harness: an option fixture `cvSnapSetup: { host: boolean; profile: boolean }`, default both
     true. The new test sets both false, so no host is registered and no profile is seeded.
   - `e2e/tests/history-only.spec.ts`:
     1. Acknowledge the notice; the setup check fails (helper not installed).
     2. Use without the helper.
     3. Add a small PDF (built in the test).
     4. History-only home: Save my CV to history on the fixture ad; title prefilled from the
        page; Save.
     5. History shows "Your CV" with the ad's site.
     6. After step 2, `chrome.runtime.connectNative` / `connect` calls to the host are counted in
        the panel and the service worker; the count is 0 at the end.
   - CI runs it with the other two (same `pnpm test:e2e`).

### Dependencies

- Bolts 028 and 029.
- The E2E harness of bolt 022 (fixtures, side panel helper, job board).

### Acceptance Criteria (stories 004–006)

- [ ] Export in history-only mode: a file with the history (sources kept) and no profile
- [ ] That file on a clean browser: same entries and PDFs, panel in history-only mode
- [ ] A backup with a profile imported in history-only mode creates the profile and ends the mode
- [ ] A profile-less backup imported where a profile exists merges only the history
- [ ] 0.1.x and 0.2.0 backups import unchanged
- [ ] Privacy policy (en, pl) and the notice point mention own CVs and history-only mode; notice version per decision 3
- [ ] E2E: no host registered → use without the helper → save own CV → "Your CV" in History; no host connection after the setup check
- [ ] `pnpm test:e2e` runs the new test locally and in CI

### Tests (stage 3)

- `backup.test.ts`: profile-less round trip, refused when there's neither profile nor history, a 0.2.0-style file still parsed.
- `BackupSection.test.tsx`: export without a profile, the history-only import confirm, the flag callback, and a profile-less file merged next to a profile.
- `App.test.tsx`: import a profile-less backup on a clean panel → history-only home.
- E2E as above.
