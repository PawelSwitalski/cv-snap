---
unit: 002-host-package
intent: 002-release-readiness
phase: inception
status: complete
unit_type: cli
default_bolt_type: simple-construction-bolt
created: '2026-10-29T16:09:23Z'
updated: '2026-10-29T16:09:23Z'
---

# Unit Brief: 002-host-package

## Purpose

Turn the native host into the npm package `cv-snap-host` that a user installs with `npx cv-snap-host install` on Windows, macOS or Linux, with a stable install location, a `doctor` command and a release packing step.

---

## Assigned Requirements

| FR | Requirement | Priority |
|---|---|---|
| FR-4 | Publishable host package `cv-snap-host` | Must |
| FR-5 | One command for users and Chrome | Must |
| FR-6 | Install to a stable per-user location | Must |
| FR-7 | `doctor` command | Should |
| FR-8 | Registration on macOS and Linux | Must |
| FR-14 | Release packing and version check | Should |

---

## Story Summary

- **Total Stories**: 6
- **Must Have**: 4
- **Should Have**: 2
- **Could Have**: 0

### Stories

- [ ] **001-bundled-host-package**: Bundled host package - Must - Planned
- [ ] **002-cli-command-routing**: One command for users and Chrome - Must - Planned
- [ ] **003-stable-install-location**: Install to a stable location - Must - Planned
- [ ] **004-macos-linux-registration**: Registration on macOS and Linux - Must - Planned
- [ ] **005-doctor-command**: doctor command - Should - Planned
- [ ] **006-release-pack-and-version-check**: Release packing and version check - Should - Planned

---

## Dependencies

- **Depends on**: 001-store-ready-extension (allowed origins, release build)
- **Depended by**: 003-ci-and-release-docs (CI install tests, README commands)

---

## Success Criteria

- [ ] All acceptance criteria met
- [ ] Tests passing (unit, and CI install checks where applicable)
- [ ] Code reviewed and approved

---

## Bolt Suggestions

| Bolt | Type | Stories | Objective |
|---|---|---|---|
| 014-host-package | simple-construction-bolt | 001-bundled-host-package, 002-cli-command-routing, 003-stable-install-location | The publishable `cv-snap-host` package: `shared` bundled, user commands routed apart from the host, install to a stable directory. |
| 015-host-package | simple-construction-bolt | 004-macos-linux-registration, 005-doctor-command, 006-release-pack-and-version-check | macOS and Linux registration, `doctor`, and the release packing step with the version check. |
