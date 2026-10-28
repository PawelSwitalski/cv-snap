---
id: 003-job-ad-detection
unit: 003-job-ad-capture
intent: 001-one-click-tailored-cv
status: complete
priority: must
created: '2026-10-25T12:00:00Z'
assigned_bolt: 008-job-ad-capture
implemented: true
---

# Story: 003-job-ad-detection

## User Story

**As a** job seeker
**I want** cv-snap to recognise when I'm on a job ad and show a badge
**So that** I know I can generate with one click

## Acceptance Criteria

- [ ] **Given** a page with `JobPosting` JSON-LD on an allowed site, **When** loaded, **Then** it is detected and the badge is shown
- [ ] **Given** a URL matching a preset job-ad pattern, **When** loaded, **Then** it is detected
- [ ] **Given** only keyword signals ('Apply'/'Aplikuj', 'Requirements'/'Wymagania', …), **When** the score ≥ threshold, **Then** it is detected; below threshold it is not
- [ ] **Given** a job listing/search fixture page, **When** scored, **Then** it is not detected
- [ ] **Given** navigation away (incl. SPA route changes), **When** it happens, **Then** the badge clears/updates

## Technical Notes

- Pure scoring function, unit-tested on fixture HTML
- Watch SPA navigation (history API / URL change observer)

## Dependencies

### Requires
- 002-dynamic-content-scripts

### Enables
- 004-job-ad-text-extraction

## Edge Cases

| Scenario | Expected Behavior |
|---|---|
| Ad loaded lazily after page load | Re-score on DOM mutation (debounced) |

## Out of Scope

- Text extraction (004)
