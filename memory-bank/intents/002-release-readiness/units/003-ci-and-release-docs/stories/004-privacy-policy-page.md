---
id: 004-privacy-policy-page
unit: 003-ci-and-release-docs
intent: 002-release-readiness
status: complete
priority: must
created: '2026-10-29T16:09:23Z'
assigned_bolt: 016-ci-and-release-docs
implemented: true
---

# Story: 004-privacy-policy-page

## User Story

**As a** user and Chrome Web Store reviewer
**I want** a public privacy policy
**So that** I know where my CV goes

## Acceptance Criteria

- [ ] **Given** the page, **When** read, **Then** it states what goes to Anthropic (CV profile and job ad, via the user's Claude Code), that there are no cv-snap servers or telemetry, what is stored locally and how to delete it, and a contact
- [ ] **Given** the in-app privacy notice and the listing answers, **When** compared, **Then** they say the same (NFR-2)
- [ ] **Given** the page, **When** published, **Then** it is served by GitHub Pages in English and Polish, dated and versioned

## Technical Notes

- Static page in `docs/` (GitHub Pages from the main branch)

## Edge Cases

| Scenario | Expected Behavior |
|---|---|
| Privacy notice changes later | Policy version and in-app notice version are bumped together |
