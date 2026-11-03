---
id: 001-history-store
unit: 001-history-core
intent: 004-application-history
status: complete
priority: must
created: '2026-11-03T15:28:00Z'
assigned_bolt: 023-history-core
implemented: true
---

# Story: 001-history-store

## User Story

**As a** job seeker
**I want** my downloaded CVs kept on this PC across browser restarts
**So that** I can find them later

## Acceptance Criteria

- [ ] **Given** a new entry (AdKey, title, company, URL, language, file name, PDF blob, snapshot or none, ad text, created, last downloaded, sent date null), **When** it is saved, **Then** reading it back after reopening the side panel returns the same data and identical PDF bytes
- [ ] **Given** an entry for an AdKey, **When** another entry is saved for the same AdKey, **Then** there is still one entry (upsert)
- [ ] **Given** entries, **When** the list is read, **Then** it returns metadata only (no blobs), sorted by last downloaded, newest first
- [ ] **Given** an entry is deleted, **When** storage is inspected, **Then** its metadata, PDF and snapshot are all gone
- [ ] **Given** a stored record that fails schema validation or has a newer `schemaVersion`, **When** the list is read, **Then** it is skipped and counted as unreadable; the rest still load
- [ ] **Given** 500 entries, **When** the list is read, **Then** it returns in < 200 ms (metadata only)

## Technical Notes

- New `extension/src/features/history/`: zod schema with `schemaVersion: 1`, `HistoryRepository` port + IndexedDB adapter (`idb-keyval` stores `history-meta`, `history-files` in DB `cv-snap`, or a small `idb` wrapper if indexes are needed) + in-memory fake for tests
- Metadata and blobs in separate stores so listing never loads PDFs
- Keep a list-ready shape (e.g. `pdf` as the latest of possible versions) without building versions now

## Edge Cases

| Scenario | Expected Behavior |
|---|---|
| Storage quota error | Save rejects with a typed error; caller shows it (story 002) |
| Title and company both unknown | Stored empty; UI shows the ad host or "Untitled ad" |
