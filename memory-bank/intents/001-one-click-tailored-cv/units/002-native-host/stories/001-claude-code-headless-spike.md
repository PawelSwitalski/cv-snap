---
id: 001-claude-code-headless-spike
unit: 002-native-host
intent: 001-one-click-tailored-cv
status: complete
priority: must
created: '2026-10-25T12:00:00Z'
assigned_bolt: 001-native-host
implemented: true
---

# Story: 001-claude-code-headless-spike

## User Story

**As a** developer
**I want** to confirm how headless Claude Code disables tools, returns structured JSON, selects a model, and reports auth/model errors
**So that** the provider is built on verified behavior instead of assumptions

## Acceptance Criteria

- [ ] **Given** the installed Claude Code, **When** I run `claude -p` with tool restriction flags, **Then** I confirm no tool (file, shell, web) can be invoked, including when the prompt asks for it
- [ ] **Given** a JSON-schema-shaped request, **When** run headless, **Then** I document the most reliable way to get schema-valid JSON
- [ ] **Given** `--model` with Sonnet 5.5 / Opus 5.5 / Haiku 5.5 and an invalid model, **When** run, **Then** I document outputs and error shapes (for `MODEL_UNAVAILABLE`)
- [ ] **Given** a logged-out CLI, **When** run, **Then** I document how to detect `CLAUDE_NOT_AUTHENTICATED`
- [ ] **Given** the findings, **When** the spike ends, **Then** `spike-report.md` in the bolt folder records flags, the tested version (= minimum), timings and risks

## Technical Notes

- Time-boxed (≤ half a day)
- Use a throwaway script in the bolt folder; no production code

## Dependencies

### Requires
- None

### Enables
- 002-native-messaging-protocol
- 004-health-check
- 005-claude-code-provider

## Edge Cases

| Scenario | Expected Behavior |
|---|---|
| Flag behavior differs across versions | Record the tested version as minimum |

## Out of Scope

- Production provider code (story 005)
