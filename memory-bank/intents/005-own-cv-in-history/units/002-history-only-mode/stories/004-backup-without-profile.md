---
id: 004-backup-without-profile
unit: 002-history-only-mode
intent: 005-own-cv-in-history
status: draft
priority: must
created: '2026-11-04T16:40:00Z'
assigned_bolt: 030-history-only-backup
implemented: false
---

# Story: 004-backup-without-profile

## User Story

**As a** job seeker
**I want** back up my history even without a profile
**So that** I can move to a new PC in history-only mode

## Acceptance Criteria

- [ ] **Given** history-only mode, **When** I export, **Then** the file holds the history (sources kept) and no profile
- [ ] **Given** that file on a clean browser, **When** imported, **Then** the same entries and PDFs appear and the panel is in history-only mode
- [ ] **Given** a backup with a profile, **When** imported in history-only mode, **Then** the profile is created and history-only mode ends
- [ ] **Given** a profile-less backup, **When** imported where a profile exists, **Then** only the history merges and the profile is unchanged
- [ ] **Given** backups from 0.1.x and 0.2.0, **When** imported, **Then** they import unchanged

## Technical Notes

- `profile` becomes optional in the backup envelope only when history is present; profile schema version unchanged
- 0.2.0 refuses a profile-less file as invalid (stated in release notes)

## Edge Cases

| Scenario | Expected Behavior |
|---|---|
| Profile-less file without history | Refused as empty |
