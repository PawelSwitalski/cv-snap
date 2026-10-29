---
id: 002-cli-command-routing
unit: 002-host-package
intent: 002-release-readiness
status: draft
priority: must
created: 2026-10-29T16:09:23Z
assigned_bolt: 014-host-package
implemented: false
---

# Story: 002-cli-command-routing

## User Story

**As a** user
**I want** `cv-snap-host install | uninstall | doctor | --version | --help`
**So that** I can manage the host myself

## Acceptance Criteria

- [ ] **Given** Chrome starts the program with a `chrome-extension://` origin argument, **When** it runs, **Then** it serves native messaging (stdout carries protocol frames only)
- [ ] **Given** a user command, **When** run, **Then** it does that command and prints readable output
- [ ] **Given** an unknown argument, **When** run, **Then** usage is printed and the exit code is 2

## Technical Notes

- Chrome passes the caller origin (and on Windows a parent window handle) as arguments

## Edge Cases

| Scenario | Expected Behavior |
|---|---|
| No arguments at all | Prints usage (a user ran it by hand), exit code 2 |
