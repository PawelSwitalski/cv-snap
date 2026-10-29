---
id: 003-end-user-readme
unit: 003-ci-and-release-docs
intent: 002-release-readiness
status: draft
priority: must
created: 2026-10-29T16:09:23Z
assigned_bolt: 016-ci-and-release-docs
implemented: false
---

# Story: 003-end-user-readme

## User Story

**As a** new user
**I want** install and first-run instructions
**So that** I get from nothing to my first tailored CV

## Acceptance Criteria

- [ ] **Given** the README, **When** read, **Then** it covers prerequisites, store install, `npx cv-snap-host install`, first run, uninstall and a privacy summary linking the policy
- [ ] **Given** a setup error, **When** looked up, **Then** the troubleshooting section has its fix and mentions `doctor`
- [ ] **Given** the old text, **When** replaced, **Then** the "early development" status line is gone and the development setup stays below

## Technical Notes

- Store link and repository URL are placeholders until Operations creates them

## Edge Cases

| Scenario | Expected Behavior |
|---|---|
| Polish-speaking users | A short Polish section or a link to a Polish README |
