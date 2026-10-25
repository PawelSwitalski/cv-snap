---
id: 005-claude-code-provider
unit: 002-native-host
intent: 001-one-click-tailored-cv
status: draft
priority: must
created: 2026-10-25T12:00:00Z
assigned_bolt: 004-native-host
implemented: false
---

# Story: 005-claude-code-provider

## User Story

**As a** job seeker
**I want** every AI step run through my Claude Code safely with the model I selected
**So that** generation uses my subscription without exposing my machine to prompt injection

## Acceptance Criteria

- [ ] **Given** a request, **When** the provider runs Claude, **Then** it uses `claude -p` with all tools disabled, an empty temp working dir, capped turns and `--model <selected>`
- [ ] **Given** a run exceeding 120 s, **When** the timeout fires, **Then** the child process is killed and `GENERATION_TIMEOUT` returned
- [ ] **Given** a cancel, **When** received, **Then** the child process is killed within 2 s
- [ ] **Given** the selected model is unavailable, **When** run, **Then** `MODEL_UNAVAILABLE` is returned with a hint
- [ ] **Given** a finished run, **When** complete, **Then** the temp directory is deleted

## Technical Notes

- Implements `CvGenerationProvider` from `shared/`
- Spawn without shell; prompt via stdin to avoid arg-length limits on Windows
- Default model `claude-sonnet-5-5`

## Dependencies

### Requires
- 001-claude-code-headless-spike
- 002-native-messaging-protocol

### Enables
- None within this unit

## Edge Cases

| Scenario | Expected Behavior |
|---|---|
| Claude returns non-JSON text | Returned as GENERATION_FAILED for the pipeline's retry logic |
| Kill on Windows leaves grandchildren | Kill the process tree |

## Out of Scope

- Prompt content (001)
