---
id: 003-already-in-history-hint
unit: 002-history-ui
intent: 004-application-history
status: draft
priority: should
created: '2026-11-03T15:28:00Z'
assigned_bolt: 024-history-ui
implemented: false
---

# Story: 003-already-in-history-hint

## User Story

**As a** job seeker
**I want** to see when I already made a CV for the ad I'm looking at
**So that** I don't apply twice by mistake

## Acceptance Criteria

- [ ] **Given** the current tab's ad has an entry, **When** the Generate view shows it (before or after generating), **Then** it says "You downloaded a CV for this ad on {date}" or "… and sent it on {date}" with a link that opens the entry in History
- [ ] **Given** the hint is shown, **When** I click Generate, **Then** generation runs as usual
- [ ] **Given** an ad without an entry, **When** shown, **Then** no hint

## Technical Notes

- Needs the AdKey before generation: compute it from the capture the Generate view already does for detection, or on Generate click; keep the lookup cheap (metadata store by AdKey)

## Edge Cases

| Scenario | Expected Behavior |
|---|---|
| Same URL, different offer (justjoin.it) | No hint: AdKey includes the content fingerprint |
