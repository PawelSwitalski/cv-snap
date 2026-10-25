---
unit: 003-job-ad-capture
intent: 001-one-click-tailored-cv
phase: inception
status: ready
unit_type: frontend
default_bolt_type: simple-construction-bolt
created: 2026-10-25T12:00:00Z
updated: 2026-10-25T12:00:00Z
---

# Unit Brief: 003-job-ad-capture

## Purpose

Everything about reading job ads from the web: the user-managed allowed-sites list, dynamic content scripts, job-ad detection, text extraction, and the manual selection fallback.

## Scope

### In Scope
- Allowed-sites list with presets and per-site Chrome permissions
- Dynamic content script registration for granted origins
- Detection scoring (JSON-LD, URL patterns, keywords) + badge
- Readability extraction, JSON-LD seeding, 50k cap
- Manual selection fallback

### Out of Scope
- Parsing requirements with Claude (001)
- Generate button UI (005)
- Site-specific adapters (future intent)

---

## Assigned Requirements

**These FRs from the intent are assigned to this unit. Stories are created from these.**

| FR | Requirement | Priority |
|---|---|---|
| FR-6 | Allowed sites management | Must |
| FR-7 | Job ad detection and extraction | Must |
| FR-8 | Manual selection fallback | Must |

---

## Domain Concepts

### Key Entities
| Entity | Description | Attributes |
|---|---|---|
| AllowedSite | A user-granted origin | origin, label, isPreset, addedAt |
| JobAdCapture | Result of capturing an ad | url, text, jsonLd?, source (auto|selection), detectionScore |

### Key Operations
| Operation | Description | Inputs | Outputs |
|---|---|---|---|
| addSite / removeSite | Grant/revoke origin access | origin | updated list |
| detectJobAd | Score current page | DOM, URL | score, isJobAd |
| captureJobAd | Extract ad text | DOM, selection? | JobAdCapture |

---

## Story Summary

- **Total Stories**: 5
- **Must Have**: 5
- **Should Have**: 0
- **Could Have**: 0

### Stories

- [ ] **001-allowed-sites-management**: Allowed sites management - Must - Planned
- [ ] **002-dynamic-content-scripts**: Dynamic content scripts - Must - Planned
- [ ] **003-job-ad-detection**: Job ad detection - Must - Planned
- [ ] **004-job-ad-text-extraction**: Job ad text extraction - Must - Planned
- [ ] **005-manual-selection-fallback**: Manual selection fallback - Must - Planned

---

## Dependencies

### Depends On
| Unit | Reason |
|---|---|
| 001-cv-tailoring-core | Ad input types, error codes |

### Depended By
| Unit | Reason |
|---|---|
| 005-tailored-cv-ui | Generate flow, Add-this-site button, settings list |

### External Dependencies
| System | Purpose | Risk |
|---|---|---|
| Job board websites | Ad content | Medium |
| @mozilla/readability | Readable text | Low |

---

## Technical Context

### Suggested Technology
WXT content script (registered dynamically via `chrome.scripting.registerContentScripts`), `chrome.permissions`, `@mozilla/readability`.

### Integration Points
| Integration | Type | Protocol |
|---|---|---|
| Chrome permissions | API | chrome.permissions |
| Background worker | Messaging | chrome.runtime |

### Data Storage
| Data | Type | Volume | Retention |
|---|---|---|---|
| Allowed sites | chrome.storage.local | Tens of entries | Until removed |

---

## Constraints

- No default host permissions; `optional_host_permissions: ["https://*/*"]`
- Content scripts run only on granted origins

---

## Success Criteria

### Functional
- [ ] Sites added/removed stay in sync with Chrome permissions
- [ ] Preset-board ads with JSON-LD or URL match are always detected

### Non-Functional
- [ ] Detection adds no noticeable page slowdown (≤ 50 ms scoring)
- [ ] No false-positive badge on listing/search fixture pages

### Quality
- [ ] Code coverage ~80% (shared/native-host) or most important user flows covered (extension), per coding standards
- [ ] All acceptance criteria met
- [ ] Code reviewed and approved

---

## Bolt Suggestions

| Bolt | Type | Stories | Objective |
|---|---|---|---|
| 007-job-ad-capture | simple-construction-bolt | 001-allowed-sites-management, 002-dynamic-content-scripts | User-managed allowed sites with per-origin permissions and dynamically registered content scripts. |
| 008-job-ad-capture | simple-construction-bolt | 003-job-ad-detection, 004-job-ad-text-extraction, 005-manual-selection-fallback | Detect job ads (JSON-LD, URL patterns, keywords), extract their text, and support manual selection. |

---

## Notes

Detection thresholds are tuned on the ad fixtures provided for the regression suite.
