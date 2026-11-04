---
intent: 005-own-cv-in-history
phase: inception
status: complete
updated: 2026-11-04T16:40:00Z
---

# Own CV in History - Unit Decomposition

## Units Overview

Two units: saving an own CV for an ad (works with or without the helper), then the history-only
mode that lets a user without the helper set up and use cv-snap, with its backup and E2E test.

### Unit 1: 001-own-cv-save

**Description**: The entry source ("own" / "tailored"), saving the stored or a picked CV with the
captured ad, offline title and company, and the replace rule across both kinds.

**Assigned Requirements**: FR-1, FR-2, FR-3, FR-4

**Stories**: 001-entry-source, 002-save-own-cv, 003-save-own-cv-panel

**Dependencies**: Depends on None · Depended by 002-history-only-mode

**Default bolt type**: simple-construction-bolt · **Estimated Complexity**: M

### Unit 2: 002-history-only-mode

**Description**: "Use without the helper" from the setup check, upload without AI, home without
Generate, setting up the helper later, replacing the stored CV, backups without a profile, the
privacy text, and the E2E test with no host.

**Assigned Requirements**: FR-5, FR-6, FR-7, NFR (privacy, E2E)

**Stories**: 001-history-only-onboarding, 002-helper-later, 003-replace-stored-cv,
004-backup-without-profile, 005-privacy-text, 006-history-only-e2e

**Dependencies**: Depends on 001-own-cv-save · Depended by Operations (next release)

**Default bolt type**: simple-construction-bolt · **Estimated Complexity**: M

## Requirement-to-Unit Mapping

- **FR-1** Save my CV for the current ad → 001-own-cv-save
- **FR-2** Title and company without AI → 001-own-cv-save
- **FR-3** Which CV an entry holds → 001-own-cv-save
- **FR-4** One entry per ad, either kind → 001-own-cv-save
- **FR-5** History-only mode → 002-history-only-mode
- **FR-6** Replace my stored CV → 002-history-only-mode
- **FR-7** Backups without a profile → 002-history-only-mode

## Unit Dependency Graph

```text
001-own-cv-save ──> 002-history-only-mode ──> Operations
```

## Execution Order

1. 001-own-cv-save (bolt 028)
2. 002-history-only-mode (bolts 029, 030)
