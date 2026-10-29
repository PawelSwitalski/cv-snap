---
id: 004-macos-linux-registration
unit: 002-host-package
intent: 002-release-readiness
status: draft
priority: must
created: 2026-10-29T16:09:23Z
assigned_bolt: 015-host-package
implemented: false
---

# Story: 004-macos-linux-registration

## User Story

**As a** macOS or Linux user
**I want** `install` to register the host with Chrome
**So that** cv-snap works on my system too

## Acceptance Criteria

- [ ] **Given** macOS, **When** `install` runs, **Then** the manifest is written to `~/Library/Application Support/Google/Chrome/NativeMessagingHosts/`
- [ ] **Given** Linux, **When** `install` runs, **Then** the manifest is written to `~/.config/google-chrome/NativeMessagingHosts/`
- [ ] **Given** either, **When** installed, **Then** the launcher is a 0755 shell script running the installed runtime with the Node that ran `install`; `uninstall` removes both
- [ ] **Given** any OS, **When** installing, **Then** no step needs admin rights and nothing is downloaded

## Technical Notes

- Windows keeps the HKCU registry value; paths come from one per-OS table

## Edge Cases

| Scenario | Expected Behavior |
|---|---|
| Node installed via a version manager (nvm, fnm) | The launcher uses the absolute Node path from install time; `doctor` warns if it disappears |
