---
id: 002-mark-as-sent
unit: 002-history-ui
intent: 004-application-history
status: draft
priority: must
created: '2026-11-03T15:28:00Z'
assigned_bolt: 024-history-ui
implemented: false
---

# Story: 002-mark-as-sent

## User Story

**As a** job seeker
**I want** to mark an application as sent, with the date
**So that** I know where I've already applied

## Acceptance Criteria

- [ ] **Given** a not-sent entry, **When** I mark it as sent, **Then** its sent date is today
- [ ] **Given** a sent entry, **When** I change the date, **Then** the new date is saved; dates in the future can't be picked
- [ ] **Given** a sent entry, **When** I mark it as not sent, **Then** the date is cleared
- [ ] **Given** the Generate view after Download PDF, **When** I click Mark as sent, **Then** the current ad's entry is marked
- [ ] **Given** a sent entry, **When** I download again or restart the browser, **Then** it is still sent with the same date

## Technical Notes

- Dates stored as `YYYY-MM-DD` (local calendar date, not a timestamp)
