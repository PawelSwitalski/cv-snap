---
id: 002-save-on-download
unit: 001-history-core
intent: 004-application-history
status: draft
priority: must
created: '2026-11-03T15:40:00Z'
assigned_bolt: 023-history-core
implemented: false
---

# Story: 002-save-on-download

## User Story

**As a** job seeker
**I want** the CV I download to be saved to history automatically
**So that** I don't have to remember which CV I sent where

## Acceptance Criteria

- [ ] **Given** a result in the Generate view, **When** I click Download PDF, **Then** the PDF downloads and an entry is saved with the exact same bytes, the file name, the ad's title/company/URL, output language and dates
- [ ] **Given** an entry for this ad already exists and is marked sent, **When** I download again, **Then** the PDF and last-downloaded date are replaced, the created date and sent date are kept
- [ ] **Given** the save to history fails, **When** I download, **Then** the file still downloads and a non-blocking message says the CV wasn't saved to history
- [ ] **Given** a successful save, **When** the download finishes, **Then** a short "Saved to history" confirmation appears
- [ ] **Given** the session result restored after reopening the panel (`generate.lastResult`), **When** I download, **Then** the entry is saved the same way (AdKey and snapshot travel with the session result)

## Technical Notes

- Hook into the existing download path (`features/cv-pdf/download.ts` caller in the Generate view); render once and use the same blob for both the download and history
- The session result needs the `AdKey`, the ad metadata and the snapshot reference; the snapshot itself goes to IndexedDB at capture time (session storage is small), keyed by a capture ID, and is moved into the entry on download
- Saving must not delay `downloadPdf` (start the download first)

## Edge Cases

| Scenario | Expected Behavior |
|---|---|
| Manual selection ad | URL stored as null; AdKey from the selection text, as for the cache |
| Two downloads in quick succession | One entry, last write wins |
