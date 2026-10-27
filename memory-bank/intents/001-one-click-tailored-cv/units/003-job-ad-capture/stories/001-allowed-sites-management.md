---
id: 001-allowed-sites-management
unit: 003-job-ad-capture
intent: 001-one-click-tailored-cv
status: complete
priority: must
created: '2026-10-25T12:00:00Z'
assigned_bolt: 007-job-ad-capture
implemented: true
---

# Story: 001-allowed-sites-management

## User Story

**As a** job seeker
**I want** to choose exactly which job sites cv-snap may read, from presets or the current tab
**So that** the extension never reads pages I didn't allow

## Acceptance Criteria

- [ ] **Given** the presets (LinkedIn, Indeed, Pracuj.pl, justjoin.it, NoFluffJobs, Bulldogjob), **When** I add one, **Then** Chrome's permission prompt appears for that origin only
- [ ] **Given** I deny the prompt, **When** it closes, **Then** the site is not added
- [ ] **Given** an unlisted current tab, **When** I choose 'Add this site', **Then** the permission is requested for its origin and, on approval, the site is listed
- [ ] **Given** a listed site, **When** I remove it, **Then** the Chrome permission is revoked
- [ ] **Given** I revoke access in `chrome://extensions`, **When** the list is next shown, **Then** the site is gone (`permissions.onRemoved`)

## Technical Notes

- Manifest: no `host_permissions`; `optional_host_permissions: ["https://*/*"]`
- `chrome.permissions.request` must be called from a user gesture in the side panel
- Exposes a store/API used by the settings UI (005/008)

## Dependencies

### Requires
- 001-cv-tailoring-core/001-monorepo-scaffold

### Enables
- 002-dynamic-content-scripts

## Edge Cases

| Scenario | Expected Behavior |
|---|---|
| Subdomains (pl.linkedin.com) | Preset patterns include required subdomains |
| http-only site | Not supported; message shown |

## Out of Scope

- Settings screen layout (005)
