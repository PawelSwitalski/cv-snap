---
id: 001-entry-source
unit: 001-own-cv-save
intent: 005-own-cv-in-history
status: draft
priority: must
created: '2026-11-04T16:40:00Z'
assigned_bolt: 028-own-cv-save
implemented: false
---

# Story: 001-entry-source

## User Story

**As a** job seeker
**I want** know which CV I sent for each ad
**So that** I don't send the wrong one to a follow-up

## Acceptance Criteria

- [ ] **Given** a history entry, **When** it is saved by Download PDF, **Then** its source is "tailored"; an entry saved with my own CV has source "own"
- [ ] **Given** entries from 0.2.0 without a source, **When** listed, **Then** they show "Tailored" and are not rewritten
- [ ] **Given** the History list and the entry details, **When** shown, **Then** each entry shows "Your CV" or "Tailored"
- [ ] **Given** a backup with own-CV entries, **When** exported and imported, **Then** the source is kept; 0.2.0 reads the same file and shows them as Tailored

## Technical Notes

- Optional `source` in `HistoryEntrySchema`; `HISTORY_SCHEMA_VERSION` stays 1 (constraint)
- `recordDownload` writes "tailored"; `mergeEntry` treats a missing source as tailored
- en/pl strings for both labels

## Edge Cases

| Scenario | Expected Behavior |
|---|---|
| Unknown source value in a backup | Backup refused as invalid (as any bad entry) |
