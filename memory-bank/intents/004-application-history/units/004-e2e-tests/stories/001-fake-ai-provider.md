---
id: 001-fake-ai-provider
unit: 004-e2e-tests
intent: 004-application-history
status: draft
priority: must
created: '2026-11-03T15:40:00Z'
assigned_bolt: 022-e2e-tests
implemented: false
---

# Story: 001-fake-ai-provider

## User Story

**As a** developer
**I want** the host to answer with canned JSON in tests
**So that** E2E runs without Claude Code or network

## Acceptance Criteria

- [ ] **Given** `CV_SNAP_FAKE_PROVIDER=<fixtures dir>` in the host's environment, **When** the host starts, **Then** it uses a provider that returns the fixture profile, requirements and plan (validated by the same schemas)
- [ ] **Given** the variable is not set, **When** the host starts, **Then** `ClaudeCodeProvider` is used (as today)
- [ ] **Given** any extension message, **When** sent, **Then** it can't select the fake provider (test)
- [ ] **Given** the fake provider, **When** generating, **Then** progress events are emitted in the normal order

## Technical Notes

- `native-host/src/providers/fake-provider.ts` implementing `CvGenerationProvider`; selection in `host-main.ts`
- Fixtures under `e2e/fixtures/` (profile, requirements, plan consistent with the fixture job-ad page)
