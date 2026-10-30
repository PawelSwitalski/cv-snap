---
unit: 003-ci-and-release-docs
intent: 002-release-readiness
phase: inception
status: complete
unit_type: cli
default_bolt_type: simple-construction-bolt
created: '2026-10-29T16:09:23Z'
updated: '2026-10-29T16:09:23Z'
---

# Unit Brief: 003-ci-and-release-docs

## Purpose

Continuous integration on Windows, macOS and Linux, and the documents a release needs: MIT license, end-user README, privacy policy page and the Chrome Web Store listing texts.

---

## Assigned Requirements

| FR | Requirement | Priority |
|---|---|---|
| FR-9 | Continuous integration on three OSes | Must |
| FR-10 | License | Must |
| FR-11 | End-user README | Must |
| FR-12 | Privacy policy page | Must |
| FR-13 | Chrome Web Store listing texts | Must |

---

## Story Summary

- **Total Stories**: 5
- **Must Have**: 5
- **Should Have**: 0
- **Could Have**: 0

### Stories

- [ ] **001-ci-three-os**: CI on three operating systems - Must - Planned
- [ ] **002-mit-license**: MIT license - Must - Planned
- [ ] **003-end-user-readme**: End-user README - Must - Planned
- [ ] **004-privacy-policy-page**: Privacy policy page - Must - Planned
- [ ] **005-store-listing-texts**: Chrome Web Store listing texts - Must - Planned

---

## Dependencies

- **Depends on**: 002-host-package (commands, tarball), 001-store-ready-extension (icons)
- **Depended by**: Operations (release)

---

## Success Criteria

- [ ] All acceptance criteria met
- [ ] Tests passing (unit, and CI install checks where applicable)
- [ ] Code reviewed and approved

---

## Bolt Suggestions

| Bolt | Type | Stories | Objective |
|---|---|---|---|
| 016-ci-and-release-docs | simple-construction-bolt | 001-ci-three-os, 002-mit-license, 003-end-user-readme, 004-privacy-policy-page, 005-store-listing-texts | CI on Windows, macOS and Linux with install tests, the MIT license, the end-user README, the privacy policy page and the store listing texts. |
