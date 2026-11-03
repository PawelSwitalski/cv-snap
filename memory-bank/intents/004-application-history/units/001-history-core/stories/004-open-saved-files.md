---
id: 004-open-saved-files
unit: 001-history-core
intent: 004-application-history
status: complete
priority: must
created: '2026-11-03T15:28:00Z'
assigned_bolt: 023-history-core
implemented: true
---

# Story: 004-open-saved-files

## User Story

**As a** job seeker
**I want** to open a saved CV or job-ad page from history
**So that** I can check what I sent and what the ad asked for

## Acceptance Criteria

- [ ] **Given** an entry, **When** I open its PDF, **Then** it opens in a new tab in Chrome's PDF viewer with the stored bytes
- [ ] **Given** an entry with a snapshot, **When** I open the saved page, **Then** it opens in a new tab and no script from the page runs (fixture test)
- [ ] **Given** an opened snapshot, **When** inspected, **Then** it can't call extension APIs (no `chrome.runtime` access from the page)
- [ ] **Given** an entry without a snapshot (too large or failed), **When** I open the saved page, **Then** a read-only view shows the stored ad text with the same banner

## Technical Notes

- Open via an extension viewer page (e.g. `history-view.html?id=…`) that renders the snapshot in a sandboxed `<iframe sandbox srcdoc>` (no `allow-scripts`, no `allow-same-origin`), or a `blob:` URL with the CSP; pick the one that keeps page code away from extension APIs
- PDF: `blob:` URL from the extension page, revoked when the tab is closed or after load

## Edge Cases

| Scenario | Expected Behavior |
|---|---|
| Entry deleted while its tab is open | Viewer shows "This entry was deleted" |
