---
unit: 001-store-ready-extension
intent: 002-release-readiness
phase: inception
status: ready
unit_type: frontend
default_bolt_type: simple-construction-bolt
created: 2026-10-29T16:09:23Z
updated: 2026-10-29T16:09:23Z
---

# Unit Brief: 001-store-ready-extension

## Purpose

Make the extension uploadable to the Chrome Web Store and able to reach the host once the store assigns its ID: a release build without the dev key, the store ID trusted next to the dev ID, and icons.

---

## Assigned Requirements

| FR | Requirement | Priority |
|---|---|---|
| FR-1 | Store build without the dev key | Must |
| FR-2 | Host trusts the store and dev extension IDs | Must |
| FR-3 | Extension icons | Must |

---

## Story Summary

- **Total Stories**: 3
- **Must Have**: 3
- **Should Have**: 0
- **Could Have**: 0

### Stories

- [ ] **001-release-build-without-key**: Release build without the dev key - Must - Planned
- [ ] **002-store-extension-id**: Store extension ID trusted by the host - Must - Planned
- [ ] **003-extension-icons**: Extension icons - Must - Planned

---

## Dependencies

- **Depends on**: None
- **Depended by**: 002-host-package (allowed origins), 003-ci-and-release-docs (screenshots, listing)

---

## Success Criteria

- [ ] All acceptance criteria met
- [ ] Tests passing (unit, and CI install checks where applicable)
- [ ] Code reviewed and approved

---

## Bolt Suggestions

| Bolt | Type | Stories | Objective |
|---|---|---|---|
| 013-store-ready-extension | simple-construction-bolt | 001-release-build-without-key, 002-store-extension-id, 003-extension-icons | Release build without the dev key, the store ID trusted next to the dev ID, and icons. |
