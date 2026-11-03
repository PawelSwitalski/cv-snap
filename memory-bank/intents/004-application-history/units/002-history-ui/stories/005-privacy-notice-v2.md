---
id: 005-privacy-notice-v2
unit: 002-history-ui
intent: 004-application-history
status: complete
priority: must
created: '2026-11-03T15:28:00Z'
assigned_bolt: 025-history-ui
implemented: true
---

# Story: 005-privacy-notice-v2

## User Story

**As a** user
**I want** to be told what history stores and how to delete it
**So that** I can decide whether to keep it

## Acceptance Criteria

- [ ] **Given** the notice and `docs/privacy` (EN, PL), **When** read, **Then** they say history (CVs, job-ad page copies, sent dates) is stored only on this PC, kept per the retention setting, included in backups, and deleted from History or Settings or on uninstall
- [ ] **Given** `PRIVACY_NOTICE_VERSION` = 2, **When** an existing user opens the panel, **Then** they see the notice once more; after acknowledging, never again
- [ ] **Given** the policy page, **When** published, **Then** its version and date match the in-app notice

## Technical Notes

- `extension/src/features/onboarding/privacy-notice.ts`, i18n texts, `docs/privacy/index.md`, `docs/privacy/pl.md`; store listing privacy fields if they describe stored data
