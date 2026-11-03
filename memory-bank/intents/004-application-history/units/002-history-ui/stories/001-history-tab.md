---
id: 001-history-tab
unit: 002-history-ui
intent: 004-application-history
status: draft
priority: must
created: '2026-11-03T15:28:00Z'
assigned_bolt: 024-history-ui
implemented: false
---

# Story: 001-history-tab

## User Story

**As a** job seeker
**I want** a History tab listing every CV I downloaded
**So that** I can find one by company or title

## Acceptance Criteria

- [ ] **Given** entries, **When** I open History, **Then** rows show company, title, last-downloaded date and sent status, newest first
- [ ] **Given** I type in search, **When** the text matches company or title ignoring case and diacritics ("lodz" finds "Łódź"), **Then** only matching rows remain
- [ ] **Given** the filter All / Sent / Not sent, **When** I pick one, **Then** the list shows only those entries
- [ ] **Given** a row, **When** I use its actions, **Then** Open PDF, Open saved page, Open original ad (hidden without a URL) and Delete (with confirmation) work
- [ ] **Given** no entries, **When** I open History, **Then** an empty state explains that CVs appear after Download PDF
- [ ] **Given** unreadable entries were skipped, **When** I open History, **Then** a note says how many couldn't be read
- [ ] **Given** 500 entries, **When** I open History, **Then** the list is shown in < 500 ms
- [ ] All texts in EN and PL

## Technical Notes

- Third view in `entrypoints/sidepanel/App.tsx` next to Generate and Settings; Zustand store `features/history/store.ts`
- Diacritics-insensitive search: reuse NFKD + special letters from `cv-pdf/file-name.ts` (`toAsciiToken`-style folding)
- Virtualise only if 500 rows miss the target

## Edge Cases

| Scenario | Expected Behavior |
|---|---|
| Search with no matches | "No entries match" with a Clear button |
