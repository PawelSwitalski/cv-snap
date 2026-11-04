---
id: 002-save-own-cv
unit: 001-own-cv-save
intent: 005-own-cv-in-history
status: draft
priority: must
created: '2026-11-04T16:40:00Z'
assigned_bolt: 028-own-cv-save
implemented: false
---

# Story: 002-save-own-cv

## User Story

**As a** job seeker
**I want** save the CV I'm sending for this ad to my history
**So that** my history has every application, tailored or not

## Acceptance Criteria

- [ ] **Given** a captured ad and a stored original CV, **When** I save my CV, **Then** one entry is written with the stored CV's exact bytes, the ad text and the snapshot, source "own", and no native host call is made
- [ ] **Given** a picked PDF, **When** I save it, **Then** it is checked like a CV upload (signature, not empty, at most 10 MB) and saved to that entry only; the stored CV is unchanged
- [ ] **Given** an ad already in history (either kind), **When** I save my CV, **Then** it stays one entry with the new PDF, source, title, company and last-saved date; created and sent dates are kept
- [ ] **Given** a write that fails, **When** saving, **Then** no partial entry is left and the error is reported
- [ ] **Given** the ad's JSON-LD, **When** preparing the save, **Then** the title and company are prefilled from it; otherwise the title is the page title (trimmed, at most 200 chars) and the company empty

## Technical Notes

- New `recordOwnCv` next to `recordDownload`, sharing the snapshot and replace logic
- Reads `cv-original` from the file store; the file name is the stored file's name or the picked one's
- Title/company prefill from the capture (JSON-LD seed already extracted in `features/job-ad`)
- Performance: under 1 s for a 10 MB PDF

## Edge Cases

| Scenario | Expected Behavior |
|---|---|
| No stored CV | Only a picked PDF can be saved |
| Ad without a snapshot | Saved with snapshot "none", as for a tailored CV |
