---
id: 003-replace-stored-cv
unit: 002-history-only-mode
intent: 005-own-cv-in-history
status: draft
priority: should
created: '2026-11-04T16:40:00Z'
assigned_bolt: 029-history-only-mode
implemented: false
---

# Story: 003-replace-stored-cv

## User Story

**As a** job seeker
**I want** change the CV that Save my CV uses
**So that** new applications use my current CV

## Acceptance Criteria

- [ ] **Given** history-only mode, **When** I open Settings, **Then** Your CV shows the stored file's name and Replace…
- [ ] **Given** I pick a valid PDF, **When** replaced, **Then** later saves use it and existing entries keep their PDFs
- [ ] **Given** an invalid file, **When** picked, **Then** the upload messages are shown and nothing changes

## Technical Notes

- With a profile, uploading a new CV already replaces `cv-original`; no change there

## Edge Cases

None beyond the criteria.
