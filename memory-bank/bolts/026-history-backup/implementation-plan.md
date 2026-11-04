---
stage: plan
bolt: 026-history-backup
created: 2026-11-03T19:29:45Z
updated: 2026-11-04T09:00:00Z
---

## Implementation Plan: 003-history-backup (bolt 026)

### Objective

A backup carries the history as well as the profile. Importing it on a clean Chrome profile
restores everything with identical files; importing it next to an existing history merges by ad.
0.1.x profile-only backups still import.

### Decision: the backup file format (open question from inception)

**Decided (user, 2026-11-04): stay with one JSON file for now; no ZIP.** Real usage comes first.
A ZIP (or a streamed export) is reconsidered only if users report backups that are too big or
too slow. The 50 MB export warning stays, so large histories are visible.

- **The existing envelope is extended, not replaced.** `format` stays `cv-snap-profile`; an
  optional `history` field is added:

  ```text
  format "cv-snap-profile", schemaVersion (profile), exportedAt, profile, photo?   ← as in 0.1.x
  history?: { schemaVersion (history entry), entries: [
      { entry (metadata), pdfBase64, snapshotHtml?, adText } ] }
  ```

  - A profile-only export is byte-for-byte the 0.1.x format.
  - 0.1.x ignores unknown fields, so a small backup with history (≤ 5 MB) still imports there as
    profile only. A larger one is refused by 0.1.x as "too large"; nothing is half-read.
  - The snapshot and ad text are text and stay as JSON strings; only the PDF is base64.
- **File name:** `cv-snap-backup-YYYY-MM-DD.json` (was `cv-snap-profile-…`); import does not
  depend on the name.
- **Limits:**
  - Import refuses files over **256 MB** before reading them (was 5 MB). Base64 adds ~33 %, so
    this holds a history of roughly 190 MB of PDFs, well below the V8 string limit.
  - Each PDF is limited to 10 MB after decoding; each snapshot keeps the 5 MB limit.
  - A newer profile or history schema version refuses the whole file.

### Deliverables

1. **Backup format** (`features/profile/backup.ts`, extended in place)
   - `buildBackup(profile, photo, history?)`: when history is included, entries are read one by
     one from the repository and the file is assembled as `Blob` parts, so no single giant
     string is built. Nothing is sent anywhere.
   - `parseBackup(file)` returns `{ ok, profile, photo, history: { entry, files }[] }` or a typed
     problem: `TOO_LARGE`, `NOT_JSON`, `NOT_A_BACKUP`, `NEWER_VERSION`, `INVALID`, `BAD_PHOTO`,
     and new `BAD_HISTORY`.
   - **Everything is checked before anything is written:**
     - the profile against `CvProfileSchema`, as today;
     - each entry against `HistoryEntrySchema`;
     - every PDF decodes, starts with `%PDF` and is within limits; the sizes in the metadata are
       recalculated from the real files.
2. **Merge** (`features/history/merge-import.ts`), a pure decision per entry:
   - new ad → add;
   - same `AdKey`: the entry with the later `lastDownloadedAt` wins (equal dates keep the local
     one);
   - `sentOn`: kept if either side has one. If both do, the earlier date (the first time it was
     sent).
   - The writes then go through the repository. The import's `createdAt` is the earlier of the
     two.
3. **Settings → Backup** (`BackupSection.tsx`)
   - The texts change from "profile backup" to "backup".
   - New option **Include history** (on by default, disabled when the history is empty), next to
     "Include photo".
   - Export: the size is estimated from the entry sizes (×4/3 for the PDFs). **Over 50 MB, a
     dialog shows the estimate and asks for confirmation before the file is built.**
   - The import confirmation also says "N CVs from the history will be added or updated".
   - Order after confirming: history merge, then profile, then the retention `prune`.
   - The result line reads "Profile and N history entries imported".
4. **Policy:** one sentence in `docs/privacy` (EN/PL), in "What is stored": the backup file you
   export contains your profile and, if you choose, your history.

### Dependencies

- No new libraries.
- Bolts 023–025: repository, history store (`prune`, `load`), entry schema.

### Technical Approach

- **Export:** `Blob` parts (envelope head, one part per entry, tail) so memory stays near the
  history's size plus base64 overhead; the 50 MB warning makes the user aware.
- **Import:** size check → `file.text()` → `JSON.parse` → envelope → versions → profile →
  every history entry and file; only after all of that the writes start.
- **Old files keep working:** a 0.1.x file is the same envelope without `history`.

### Acceptance Criteria

- [ ] An export with history, imported on a clean profile, restores the profile and every entry
  with identical PDF, snapshot and ad-text bytes and the same metadata.
- [ ] Merge: later `lastDownloadedAt` wins; a sent date is kept if either side has one; new ads
  are added; local-only entries stay.
- [ ] A 0.1.x JSON backup still imports, profile only, history untouched.
- [ ] Without "Include history", the export is the 0.1.x format (profile only).
- [ ] Corrupt or oversized history parts, a bad PDF, or a newer version: nothing is written and a
  clear error is shown.
- [ ] Over 50 MB: the estimated size is shown and confirmed before export.
- [ ] After import, the retention setting is applied.
- [ ] Typecheck, lint, format, all tests and `pnpm test:e2e` pass.
