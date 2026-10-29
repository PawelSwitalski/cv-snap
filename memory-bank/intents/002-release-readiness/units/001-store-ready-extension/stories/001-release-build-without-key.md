---
id: 001-release-build-without-key
unit: 001-store-ready-extension
intent: 002-release-readiness
status: draft
priority: must
created: 2026-10-29T16:09:23Z
assigned_bolt: 013-store-ready-extension
implemented: false
---

# Story: 001-release-build-without-key

## User Story

**As a** release engineer
**I want** a store build of the extension without the dev `key`
**So that** the Chrome Web Store can assign the extension its own ID

## Acceptance Criteria

- [ ] **Given** `pnpm build`, **When** it finishes, **Then** the dev build keeps the dev `key` and the release build (`extension/.output/chrome-mv3` for the store, zipped) has no `key`
- [ ] **Given** both manifests, **When** compared, **Then** they differ only in `key` (a test checks name, version, permissions, icons)
- [ ] **Given** the release build, **When** zipped, **Then** the zip is at most 10 MB (NFR-3)

## Technical Notes

- WXT: switch `key` by build mode or a `CV_SNAP_RELEASE` flag in `wxt.config.ts`; `wxt zip` for the archive

## Edge Cases

| Scenario | Expected Behavior |
|---|---|
| `pnpm dev` | Unchanged: dev ID `mmchm…` so the installed host keeps working |
