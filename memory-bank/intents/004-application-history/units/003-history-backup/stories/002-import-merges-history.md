---
id: 002-import-merges-history
unit: 003-history-backup
intent: 004-application-history
status: draft
priority: must
created: '2026-11-03T15:28:00Z'
assigned_bolt: 026-history-backup
implemented: false
---

# Story: 002-import-merges-history

## User Story

**As a** job seeker
**I want** to import a backup with history
**So that** I get my applications back without losing newer ones

## Acceptance Criteria

- [ ] **Given** a backup with history, **When** I import on a clean Chrome profile, **Then** the profile and every entry are restored with identical PDF and snapshot bytes
- [ ] **Given** an entry with the same AdKey exists locally, **When** I import, **Then** the one with the later last-downloaded date wins, and a sent date is kept if either side has one
- [ ] **Given** a 0.1.x profile-only backup (`cv-snap-profile`), **When** I import, **Then** the profile imports as today and history is untouched
- [ ] **Given** a corrupt or oversized history part, **When** I import, **Then** nothing is written and a clear error is shown
- [ ] **Given** an import finished, **When** retention is set to N months, **Then** expired entries are pruned

## Technical Notes

- Validate everything before the first write; write entries one by one, profile last (or all-or-nothing if the store allows)

## Edge Cases

| Scenario | Expected Behavior |
|---|---|
| Same AdKey, equal dates | Keep the local entry; take the sent date if only the backup has one |
