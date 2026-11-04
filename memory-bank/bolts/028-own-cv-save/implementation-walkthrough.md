---
stage: implement
bolt: 028-own-cv-save
created: 2026-11-04T17:10:00Z
---

## Implementation Walkthrough: 001-own-cv-save

### Summary

The panel can save the user's own CV to History for the ad in the tab: the stored CV from setup
or a picked PDF, with an editable job title and company. Nothing in this path talks to the host.
Entries now record whether they hold "Your CV" or a "Tailored" CV, and both kinds follow the
one-entry-per-ad rule, with a confirmation before one replaces the other.

### Structure Overview

The save is a sibling of Download PDF in the history feature. One shared writer (`putEntry`)
applies the rules both kinds need: kept created and sent dates, and keeping the stored snapshot
when a capture has none. The panel component is self-contained, so the history-only home of
bolt 029 can use it as is.

### Completed Work

- [x] `extension/src/features/history/history-entry.ts` - optional `source` ("own" / "tailored") and `entrySource()`; schema version stays 1
- [x] `extension/src/features/history/record-download.ts` - `putEntry` shared writer; Download PDF writes source "tailored"
- [x] `extension/src/features/history/record-own-cv.ts` - title and company defaults (JSON-LD, else page title), stored CV file name, `recordOwnCv`
- [x] `extension/src/features/history/capture-own-cv-ad.ts` - captures the ad, its key and the snapshot straight from the content script
- [x] `extension/src/features/history/store.ts` - `recordOwnCv` action, reloading the list
- [x] `extension/src/features/history/SaveOwnCv.tsx` - Save my CV to history, Choose another PDF…, the title/company form, the replace confirmation, saved and error states
- [x] `extension/src/features/job-ad/messages.ts`, `entrypoints/job-ad.content.ts` - optional `pageTitle` in the capture reply
- [x] `extension/src/features/generate/GenerateView.tsx` - shows SaveOwnCv under Generate; asks before a tailored download replaces an own CV in History
- [x] `extension/src/features/history/HistoryHint.tsx`, `HistoryView.tsx` - "You saved your CV…" hint; "Your CV · Saved …" / "Tailored · Downloaded …" in rows
- [x] `extension/src/entrypoints/sidepanel/App.tsx`, `main.tsx` - wiring: the own-CV capture and the stored CV from the file store
- [x] `extension/public/_locales/{en,pl}/messages.json` - 22 new strings

### Key Decisions

- **The snapshot goes straight into the entry**: no pending copy, because the same click writes the entry.
- **A tailored download over an own entry still downloads at once**; only the History write waits for the answer, and Keep leaves History unchanged.
- **The output language of an own CV is the panel's language**: no AI tells which language the PDF is in, and the field is required but not shown anywhere.
- **The save buttons appear only on allowed sites** (`ad-detected` or `no-ad` with a selection), the same pages Generate can capture.

### Deviations from Plan

- None in scope. The history row's date text got its own element so the source label sits next to it.

### Dependencies Added

None.

### Developer Notes

- `putEntry` is the single place for the entry rules; Download PDF and Save my CV both go through it.
- An older content script still open in a tab sends no `pageTitle`; the job title is then empty unless the page has JSON-LD.
