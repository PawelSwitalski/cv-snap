---
id: 005-store-listing-texts
unit: 003-ci-and-release-docs
intent: 002-release-readiness
status: draft
priority: must
created: 2026-10-29T16:09:23Z
assigned_bolt: 016-ci-and-release-docs
implemented: false
---

# Story: 005-store-listing-texts

## User Story

**As a** release engineer
**I want** every listing text ready to paste
**So that** the store submission is quick and passes review

## Acceptance Criteria

- [ ] **Given** the listing file, **When** read, **Then** it has PL and EN name, short description (≤ 132 characters) and full description, and the single-purpose statement
- [ ] **Given** each permission, **When** listed, **Then** it has a justification (`storage`, `unlimitedStorage`, `nativeMessaging`, `scripting`, `sidePanel`, `activeTab`, optional `https://*/*`)
- [ ] **Given** the data-use form, **When** filled from the file, **Then** the answers match the policy (personal info: CV; not sold; not for unrelated purposes)
- [ ] **Given** the screenshots, **When** planned, **Then** the file lists five 1280×800 shots and what each shows

## Technical Notes

- Kept in `release/store-listing.md`

## Edge Cases

| Scenario | Expected Behavior |
|---|---|
| Short description over 132 characters | A test (or the pack step) checks the length |
