---
id: 005-privacy-text
unit: 002-history-only-mode
intent: 005-own-cv-in-history
status: complete
priority: must
created: '2026-11-04T16:40:00Z'
assigned_bolt: 030-history-only-backup
implemented: true
---

# Story: 005-privacy-text

## User Story

**As a** job seeker
**I want** know what is stored when I save my own CV
**So that** I trust cv-snap with it

## Acceptance Criteria

- [x] **Given** the privacy policy (en, pl), **When** read, **Then** it says an own CV can be stored in History on this computer and that in history-only mode nothing goes to Claude
- [x] **Given** the notice version, **When** decided, **Then** it is bumped only if what is stored or sent changes beyond that (decided in the bolt plan)

## Technical Notes

- `docs/privacy/index.md` and `pl.md`

## Edge Cases

None beyond the criteria.
