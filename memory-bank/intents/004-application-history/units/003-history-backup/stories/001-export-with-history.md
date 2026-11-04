---
id: 001-export-with-history
unit: 003-history-backup
intent: 004-application-history
status: complete
priority: must
created: '2026-11-03T15:28:00Z'
assigned_bolt: 026-history-backup
implemented: true
---

# Story: 001-export-with-history

## User Story

**As a** job seeker
**I want** my backup to include my history
**So that** moving to a new PC keeps my applications

## Acceptance Criteria

- [x] **Given** a profile and history, **When** I export, **Then** the file holds the profile (and photo if chosen) plus every entry's metadata, PDF and snapshot
- [x] **Given** the export would be larger than 50 MB, **When** I export, **Then** the size is shown and I confirm before saving
- [x] **Given** the new format, **When** checked, **Then** the history carries its own schema version, so a newer cv-snap's file is refused as a whole; 0.1.x imports a backup with history of at most 5 MB as profile only and refuses a larger one as too large (decided 2026-11-04, bolt 026: one JSON file, ZIP deferred)

## Technical Notes

- Decide the format in the plan stage (open question): single JSON with base64 (simple, ~1.33× size, must stream for large files) vs ZIP with `profile.json` + `history/{id}.pdf|.html` (smaller, needs a zip lib such as `fflate`)
- Raise `MAX_BACKUP_BYTES` for the new format; keep 5 MB for the legacy JSON

## Edge Cases

| Scenario | Expected Behavior |
|---|---|
| No history | Backup still valid; history section empty |
