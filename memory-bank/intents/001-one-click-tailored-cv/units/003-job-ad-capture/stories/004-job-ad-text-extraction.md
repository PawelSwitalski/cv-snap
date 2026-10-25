---
id: 004-job-ad-text-extraction
unit: 003-job-ad-capture
intent: 001-one-click-tailored-cv
status: draft
priority: must
created: 2026-10-25T12:00:00Z
assigned_bolt: 008-job-ad-capture
implemented: false
---

# Story: 004-job-ad-text-extraction

## User Story

**As a** job seeker
**I want** the full ad text captured cleanly when I click Generate
**So that** requirements parsing sees the whole ad and nothing irrelevant

## Acceptance Criteria

- [ ] **Given** a detected ad, **When** captured, **Then** Readability text includes title, description and requirements sections
- [ ] **Given** a `JobPosting` JSON-LD block, **When** captured, **Then** its title, company and description are included as structured seed fields
- [ ] **Given** text longer than 50,000 characters, **When** captured, **Then** it is truncated to 50,000
- [ ] **Given** no detected ad and no selection, **When** Generate is clicked, **Then** `JOB_AD_NOT_DETECTED` is returned

## Technical Notes

- Run Readability on a cloned document
- Strip hidden elements (`display:none`, `aria-hidden`) to reduce injection surface

## Dependencies

### Requires
- 003-job-ad-detection

### Enables
- 005-manual-selection-fallback

## Edge Cases

| Scenario | Expected Behavior |
|---|---|
| Ad inside an iframe | Not supported in MVP; manual selection works |

## Out of Scope

- Requirements parsing (001)
