---
intent: 002-release-readiness
phase: inception
status: units-decomposed
updated: 2026-10-29T16:09:23Z
---

# Release Readiness - Unit Decomposition

## Units Overview

Three units, split by where the work lands: the extension build, the host package, and the
repository-level CI and documents.

### Unit 1: 001-store-ready-extension

**Description**: Make the extension uploadable to the Chrome Web Store and able to reach the host once the store assigns its ID: a release build without the dev key, the store ID trusted next to the dev ID, and icons.

**Assigned Requirements**: FR-1, FR-2, FR-3

**Stories**: 001-release-build-without-key, 002-store-extension-id, 003-extension-icons

**Dependencies**: Depends on None · Depended by 002-host-package (allowed origins), 003-ci-and-release-docs (screenshots, listing)

**Default bolt type**: simple-construction-bolt · **Estimated Complexity**: S

### Unit 2: 002-host-package

**Description**: Turn the native host into the npm package `cv-snap-host` that a user installs with `npx cv-snap-host install` on Windows, macOS or Linux, with a stable install location, a `doctor` command and a release packing step.

**Assigned Requirements**: FR-4, FR-5, FR-6, FR-7, FR-8, FR-14

**Stories**: 001-bundled-host-package, 002-cli-command-routing, 003-stable-install-location, 004-macos-linux-registration, 005-doctor-command, 006-release-pack-and-version-check

**Dependencies**: Depends on 001-store-ready-extension (allowed origins, release build) · Depended by 003-ci-and-release-docs (CI install tests, README commands)

**Default bolt type**: simple-construction-bolt · **Estimated Complexity**: L

### Unit 3: 003-ci-and-release-docs

**Description**: Continuous integration on Windows, macOS and Linux, and the documents a release needs: MIT license, end-user README, privacy policy page and the Chrome Web Store listing texts.

**Assigned Requirements**: FR-9, FR-10, FR-11, FR-12, FR-13

**Stories**: 001-ci-three-os, 002-mit-license, 003-end-user-readme, 004-privacy-policy-page, 005-store-listing-texts

**Dependencies**: Depends on 002-host-package (commands, tarball), 001-store-ready-extension (icons) · Depended by Operations (release)

**Default bolt type**: simple-construction-bolt · **Estimated Complexity**: M

## Requirement-to-Unit Mapping

| FR | Unit |
|----|------|
| FR-1 Store build without the dev key | 001-store-ready-extension |
| FR-2 Host trusts the store and dev extension IDs | 001-store-ready-extension |
| FR-3 Extension icons | 001-store-ready-extension |
| FR-4 Publishable host package `cv-snap-host` | 002-host-package |
| FR-5 One command for users and Chrome | 002-host-package |
| FR-6 Install to a stable per-user location | 002-host-package |
| FR-7 `doctor` command | 002-host-package |
| FR-8 Registration on macOS and Linux | 002-host-package |
| FR-14 Release packing and version check | 002-host-package |
| FR-9 Continuous integration on three OSes | 003-ci-and-release-docs |
| FR-10 License | 003-ci-and-release-docs |
| FR-11 End-user README | 003-ci-and-release-docs |
| FR-12 Privacy policy page | 003-ci-and-release-docs |
| FR-13 Chrome Web Store listing texts | 003-ci-and-release-docs |

NFRs (security, privacy, size, reliability, compatibility) apply across units and are checked in
the acceptance criteria of the stories that touch them.
