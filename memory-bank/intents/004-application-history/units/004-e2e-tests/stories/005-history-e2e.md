---
id: 005-history-e2e
unit: 004-e2e-tests
intent: 004-application-history
status: draft
priority: must
created: '2026-11-03T15:40:00Z'
assigned_bolt: 027-e2e-tests
implemented: false
---

# Story: 005-history-e2e

## User Story

**As a** developer
**I want** an end-to-end test of the history flow
**So that** history keeps working across releases

## Acceptance Criteria

- [ ] **Given** a download, **When** the test opens History, **Then** the entry is listed; downloading again leaves one entry with a newer date
- [ ] **Given** the entry, **When** the test marks it as sent, **Then** the sent date shows and survives a page reload
- [ ] **Given** the entry, **When** the test opens the saved page, **Then** it shows the fixture ad and a fixture script that would set a marker never runs
- [ ] **Given** two entries, **When** the test searches and filters, **Then** the right rows remain
- [ ] **Given** a backdated entry and Delete after 1 month, **When** the panel reloads, **Then** it is gone; Delete removes another entry

## Technical Notes

- Backdate by seeding an entry through the store in the extension context (test-only helper)
