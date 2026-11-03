---
id: 003-page-snapshot
unit: 001-history-core
intent: 004-application-history
status: complete
priority: must
created: '2026-11-03T15:28:00Z'
assigned_bolt: 023-history-core
implemented: true
---

# Story: 003-page-snapshot

## User Story

**As a** job seeker
**I want** a copy of the job ad page saved with my CV
**So that** I can reread the ad after it's taken down

## Acceptance Criteria

- [ ] **Given** an ad is captured for a generation, **When** capture runs, **Then** the page HTML is captured in the same content-script call and cleaned
- [ ] **Given** a page with inline scripts, external scripts, `on*` handlers, `javascript:` URLs, iframes, `object`/`embed`, `<base>` and form actions, **When** it is cleaned, **Then** none of them remain
- [ ] **Given** relative `href`/`src`/`srcset` and CSS `url()` in `<style>`, **When** cleaned, **Then** they are absolute against the page URL
- [ ] **Given** a cleaned snapshot, **When** inspected, **Then** it has a `<meta http-equiv="Content-Security-Policy">` with `script-src 'none'` and a top banner "Saved by cv-snap on {date} from {URL}" (EN/PL by UI language)
- [ ] **Given** a cleaned snapshot larger than 5 MB, **When** saving, **Then** it is dropped and the entry records `snapshot: "too-large"`
- [ ] **Given** a typical preset job-board page, **When** captured, **Then** snapshot capture + cleaning adds < 500 ms

## Technical Notes

- Capture: `document.documentElement.outerHTML` in `job-ad.content.ts` / `capture.ts`, beside the ad text; clean in the extension page with `DOMParser` (no page code runs in a parsed document)
- Allowlist-style cleaning is safer than a blocklist: drop every element/attribute not needed for reading; keep `style` and `<link rel=stylesheet>`
- Never sent to the host (it isn't part of the generation request)

## Edge Cases

| Scenario | Expected Behavior |
|---|---|
| Page rendered by scripts only (empty body) | Snapshot saved; History shows the ad text (story 004) |
| Capture fails for the HTML only | Generation continues; entry has no snapshot |
