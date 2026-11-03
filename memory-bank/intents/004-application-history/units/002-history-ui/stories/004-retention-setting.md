---
id: 004-retention-setting
unit: 002-history-ui
intent: 004-application-history
status: draft
priority: must
created: '2026-11-03T15:40:00Z'
assigned_bolt: 025-history-ui
implemented: false
---

# Story: 004-retention-setting

## User Story

**As a** job seeker
**I want** to choose how long history is kept
**So that** old applications don't pile up unless I want them

## Acceptance Criteria

- [ ] **Given** Settings → History, **When** shown, **Then** it offers Keep forever (default) and Delete after N months (1–24), plus the entry count and space used
- [ ] **Given** Delete after N months, **When** the side panel opens, **Then** entries last downloaded more than N months ago are deleted (sent or not), with their files
- [ ] **Given** I shorten the period, **When** entries would be deleted, **Then** a confirmation says how many; cancelling keeps the old setting
- [ ] **Given** Delete all history, **When** I confirm, **Then** every entry and file is deleted
- [ ] **Given** an older stored settings object without the field, **When** read, **Then** it defaults to Keep forever (`parseSettings` field-by-field fallback)

## Technical Notes

- `Settings.historyRetention: { mode: "forever" } | { mode: "months", months: 1..24 }` in `features/settings/settings.ts`
- Pure `selectExpired(entries, retention, now)` for unit tests; the store applies it
- Space used: sum of blob sizes from metadata (store sizes at save time)

## Edge Cases

| Scenario | Expected Behavior |
|---|---|
| Clock moved back | Nothing deleted that's newer than now |
