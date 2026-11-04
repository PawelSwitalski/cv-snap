---
stage: plan
bolt: 028-own-cv-save
created: 2026-11-04T17:00:00Z
---

## Implementation Plan: 001-own-cv-save (bolt 028)

### Objective

On a job ad, the user saves their own CV to History: the CV uploaded at setup, or a PDF picked
from disk. Title and company come from the page, with no host and no Claude. Each entry shows
whether it holds "Your CV" or a "Tailored" CV, and there is still one entry per ad.

### Deliverables

1. **Entry source** (`features/history/history-entry.ts`, story 001)
   - Optional `source: "own" | "tailored"` on `HistoryEntrySchema`. A missing source means
     "tailored". The schema version stays 1, so 0.2.0 still reads the entries and backups.
   - `entrySource(entry)` helper; `recordDownload` writes "tailored".
   - Backup and merge carry the field unchanged; nothing to change in the format code.
2. **Page title in the capture** (`features/job-ad/messages.ts`, `capture.ts`)
   - The capture reply gains an optional `pageTitle` (`document.title`, trimmed, max 200 chars).
     It is only used to prefill the job title, never sent anywhere.
3. **Save logic** (`features/history/record-own-cv.ts`, story 002)
   - `ownCvDefaults(ad, pageTitle)`: title and company from JSON-LD; otherwise the page title and
     an empty company.
   - `recordOwnCv(history, { ad, adKey, snapshot, pdf, fileName, title, company, now })`: the same
     replace rule as `recordDownload`. Created and sent dates are kept; last saved = now;
     source "own"; the snapshot is stored directly (no pending copy, since nothing waits on a host).
   - The shared parts of `recordDownload` (snapshot sizes, kept dates) move into a small helper,
     so the two stay identical.
   - History store: `recordOwnCv(...)` next to `recordDownload`, reloading the list afterwards.
4. **Reading the stored CV** (`lib/storage/file-store.ts` is unchanged)
   - The panel reads `cv-original` from the file store. The file name is the stored `File`'s
     name, or `cv.pdf` if the browser kept a plain `Blob`.
5. **Panel** (`features/history/SaveOwnCv.tsx`, story 003)
   - Shown under the Generate button when a site is allowed (the same states in which Generate
     can capture):
     - **Save my CV to history**;
     - **Choose another PDF…**, a file input checked with `validateCvFile` and its messages;
     - with no stored CV, only Choose another PDF….
   - Clicking captures the ad (with snapshot). A capture error shows the same messages as
     Generate, such as "select the ad text". Then a small form appears: **Job title**,
     **Company** (prefilled), the CV file's name, and **Save** / **Cancel**.
   - If the ad has an entry of the other kind, an AlertDialog asks before replacing it.
   - On success: "Saved to history" with Show in history, as after Download PDF. On failure: a
     non-blocking error.
   - Built as one component with its own dependencies (`captureAd`, `adKeyForInput`,
     `storedCv`, `history`), so bolt 029 can put it on the history-only home unchanged.
6. **Tailored download over an own entry** (`GenerateView` / `ResultView`, FR-4)
   - The PDF still downloads at once. If the ad's entry is "own", a dialog asks "Replace your CV
     in history with this tailored CV?", and only Replace records it. Keep leaves History as it is.
7. **Labels**
   - History row: a small "Your CV" or "Tailored" badge next to the date.
   - Already-in-history hint: "You saved your CV for this ad on …" for "own" entries; the
     existing text for tailored ones.
   - en/pl strings.

### Dependencies

- Intent 004 history store, repository, snapshot cleaning and capture: reused as they are.
- `validateCvFile` (cv-upload): the same checks and messages for a picked PDF.

### Technical Approach

- No native host import anywhere in the new code path. A unit test asserts that the host client
  is never called while saving.
- The content script's capture already runs without the host. The snapshot comes back in the
  same reply and goes straight to the entry.
- Picked files are read as a `Blob` and never stored outside the entry.

### Acceptance Criteria (from stories 001–003)

- [ ] Download PDF saves source "tailored"; own CV saves source "own"; 0.2.0 entries read as Tailored
- [ ] The History row and the hint show Your CV or Tailored
- [ ] The source survives backup export and import; a 0.2.0 parser accepts the file
- [ ] Saving the stored CV writes its exact bytes, the ad text and the snapshot, with no host call
- [ ] A picked PDF is validated like an upload and doesn't replace the stored CV
- [ ] Re-saving keeps one entry; created and sent dates are kept
- [ ] Title and company are prefilled from JSON-LD or the page title, editable, and saved as typed
- [ ] Replacing an entry of the other kind asks first (both directions)
- [ ] Failure leaves nothing partial and shows an error
- [ ] Saved to history + Show in history after success
- [ ] Under 1 s for a 10 MB PDF (measured in the test stage)

### Tests (stage 3)

- `record-own-cv.test.ts`: defaults, the replace rule in both directions, source, kept dates, no
  partial write.
- `history-entry` / `merge-import` / `backup` tests: source optional, kept through a round trip.
- `SaveOwnCv.test.tsx`: buttons per state, picked-file validation, prefill and edit, the confirm
  dialog, success and failure, and the host client never called.
- `GenerateView` / `HistoryView` / `HistoryHint` tests for the badge, hint text and download confirm.
