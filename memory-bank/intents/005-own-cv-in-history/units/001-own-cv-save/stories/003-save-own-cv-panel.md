---
id: 003-save-own-cv-panel
unit: 001-own-cv-save
intent: 005-own-cv-in-history
status: complete
priority: must
created: '2026-11-04T16:40:00Z'
assigned_bolt: 028-own-cv-save
implemented: true
---

# Story: 003-save-own-cv-panel

## User Story

**As a** job seeker
**I want** a button next to Generate that saves my CV for the ad I'm looking at
**So that** I can record an application in one step

## Acceptance Criteria

- [x] **Given** a job ad in the panel, **When** I look at Generate, **Then** I see Save my CV to history and Choose another PDF…
- [x] **Given** I click either, **When** the form opens, **Then** Job title and Company are prefilled (FR-2) and editable; Save stores exactly what I typed
- [x] **Given** the ad has an entry of the other kind, **When** I save, **Then** I'm asked to confirm the replacement first
- [x] **Given** the save succeeds, **When** done, **Then** I see "Saved to history" with Show in history
- [x] **Given** the "already in history" hint, **When** shown, **Then** it says whether the entry is my CV or tailored
- [x] **Given** no stored CV, **When** I look, **Then** only Choose another PDF… is offered

## Technical Notes

- Lives in `GenerateView` (and in the history-only home, story 002-001)
- Reuses `validateCvFile` messages and the existing Saved/Show in history UI

## Edge Cases

| Scenario | Expected Behavior |
|---|---|
| Panel closed during save | The save finishes or leaves nothing (same as Download PDF) |
