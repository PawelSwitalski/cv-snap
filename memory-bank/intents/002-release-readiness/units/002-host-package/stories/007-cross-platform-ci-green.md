---
id: 007-cross-platform-ci-green
unit: 002-host-package
intent: 002-release-readiness
status: draft
priority: must
created: 2026-10-30T16:05:00Z
assigned_bolt: 017-host-package
implemented: false
---

# Story: 007-cross-platform-ci-green

## User Story

**As a** macOS or Linux user (and as the maintainer relying on CI)
**I want** the host to find Claude Code where it is usually installed, and CI to pass on all three
OSes
**So that** cv-snap works outside Windows and every release is checked on every platform

## Acceptance Criteria

- [ ] **Given** macOS or Linux and Chrome's minimal PATH, **When** Claude Code was installed with
  Homebrew, with `npm install -g` (also under nvm or fnm) or with the native installer, **Then**
  the host finds it
- [ ] **Given** the first CI run (found 2026-10-30), **When** CI runs again, **Then** `check` and
  `install` pass on Windows, macOS and Ubuntu
- [ ] **Given** tests that touch the real file system, **When** they run on any OS, **Then** they
  use that OS's layout; Windows-only behaviour (registry, `.cmd`) is tested on Windows only

## Technical Notes

- Found by the first CI run (run 41084773775): 6 host tests failed on Ubuntu and macOS; only the
  Windows install job passed
- Look next to the Node that runs the host (where npm puts global bins), plus `/opt/homebrew/bin`
  and `/usr/local/bin`; paths built with the target OS's separator

## Edge Cases

| Scenario | Expected Behavior |
|---|---|
| Claude Code on the shell PATH only (nvm) | Found next to the install-time Node |
| Several candidates | PATH first, then the per-OS locations, in a fixed order |
