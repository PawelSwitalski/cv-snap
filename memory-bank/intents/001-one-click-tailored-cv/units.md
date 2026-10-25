---
intent: 001-one-click-tailored-cv
phase: inception
status: units-decomposed
updated: 2026-10-25T12:00:00Z
---

# One-Click Tailored CV - Unit Decomposition

## Units Overview

The project type is `frontend-app` (subtype: browser extension). The preset's single frontend unit is too coarse here: there is a separate Node process (native host) and a domain-heavy core (profile/plan schemas, prompts, anti-hallucination validator). This intent decomposes into **5 units**:

### Unit 1: 001-cv-tailoring-core

**Description**: The domain heart of cv-snap. Lives mainly in `shared/` (schemas, prompts, validator) plus the generation pipeline orchestrator in the extension background. Includes the monorepo scaffold.

**Assigned Requirements**: FR-4, FR-9, FR-10, FR-11, FR-12

**Stories**: 001-monorepo-scaffold, 002-domain-schemas-and-contracts, 003-cv-profile-extraction, 004-job-requirements-parsing-and-cache, 005-tailoring-plan-generation, 006-deterministic-validator, 007-generation-pipeline-with-retry, 008-regression-fixture-suite

**Deliverables**: `shared/` package (zod schemas, message protocol types, error codes, provider interface, prompt builders, validator); pipeline orchestrator; regression test suite.

**Dependencies**: Depends on none (scaffold) · Depended by all other units

**Default bolt type**: ddd-construction-bolt · **Estimated Complexity**: XL

### Unit 2: 002-native-host

**Description**: Stateless Node.js native messaging host: protocol, installation, health check, Claude Code provider, PDF text extraction.

**Assigned Requirements**: FR-1, FR-3, FR-20

**Stories**: 001-claude-code-headless-spike, 002-native-messaging-protocol, 003-host-install-scripts, 004-health-check, 005-claude-code-provider, 006-pdf-text-extraction

**Deliverables**: `native-host/` package; `pnpm run install-host` / `uninstall-host`; spike report.

**Dependencies**: Depends on 001-cv-tailoring-core (contracts) · Depended by 001 (pipeline uses the provider), 005 (UI)

**Default bolt type**: simple-construction-bolt · **Estimated Complexity**: L

### Unit 3: 003-job-ad-capture

**Description**: Extension-side site access and job ad capture: allowed sites, dynamic content scripts, ad detection, text extraction, manual selection.

**Assigned Requirements**: FR-6, FR-7, FR-8

**Stories**: 001-allowed-sites-management, 002-dynamic-content-scripts, 003-job-ad-detection, 004-job-ad-text-extraction, 005-manual-selection-fallback

**Deliverables**: allowed-sites store + permission handling; content script; detection scorer; extractor.

**Dependencies**: Depends on 001-cv-tailoring-core (types) · Depended by 005 (UI)

**Default bolt type**: simple-construction-bolt · **Estimated Complexity**: M

### Unit 4: 004-cv-pdf-renderer

**Description**: Turns a validated tailoring plan + profile into an A4 PDF (≤ 2 pages) with `@react-pdf/renderer`, including the RODO clause.

**Assigned Requirements**: FR-14, FR-15

**Stories**: 001-cv-pdf-template, 002-two-page-fit, 003-pdf-download-and-naming, 004-gdpr-consent-clause

**Deliverables**: CV template component; fit algorithm; download helper.

**Dependencies**: Depends on 001-cv-tailoring-core (plan/profile schemas) · Depended by 005 (UI)

**Default bolt type**: simple-construction-bolt · **Estimated Complexity**: M

### Unit 5: 005-tailored-cv-ui

**Description**: The side panel application: shell, localization, onboarding, profile editor, generate flow, preview, errors, settings, export/import.

**Assigned Requirements**: FR-2, FR-5, FR-13, FR-16, FR-17, FR-18, FR-19

**Stories**: 001-side-panel-shell-and-localization, 002-onboarding-and-privacy-notice, 003-cv-upload-and-profile-creation, 004-profile-review-editor, 005-generate-flow-with-progress-and-cancel, 006-preview-and-editing, 007-error-messages-and-recovery, 008-settings-panel, 009-profile-export-import

**Deliverables**: `extension/src/entrypoints/sidepanel`, `features/*` UI, Zustand stores, `_locales/en|pl`.

**Dependencies**: Depends on 001, 002, 003, 004 · Depended by none

**Unit type**: frontend · **Default bolt type**: simple-construction-bolt · **Estimated Complexity**: L

## Requirement-to-Unit Mapping

- **FR-1** Native host installation and health check → `002-native-host`
- **FR-2** First-run onboarding and privacy notice → `005-tailored-cv-ui`
- **FR-3** CV PDF upload and text extraction → `002-native-host` (upload UI lives in 005 story 003)
- **FR-4** Structured CV profile creation → `001-cv-tailoring-core`
- **FR-5** Profile review and editing → `005-tailored-cv-ui`
- **FR-6** Allowed sites management → `003-job-ad-capture`
- **FR-7** Job ad detection and extraction → `003-job-ad-capture`
- **FR-8** Manual selection fallback → `003-job-ad-capture`
- **FR-9** Job requirements parsing and caching → `001-cv-tailoring-core`
- **FR-10** Tailored CV generation → `001-cv-tailoring-core`
- **FR-11** Deterministic validation and retry → `001-cv-tailoring-core`
- **FR-12** Output language → `001-cv-tailoring-core`
- **FR-13** Preview and editing → `005-tailored-cv-ui`
- **FR-14** PDF rendering and download → `004-cv-pdf-renderer`
- **FR-15** GDPR consent clause → `004-cv-pdf-renderer` (clause editor UI in 005 story 008)
- **FR-16** Progress and cancel → `005-tailored-cv-ui` (protocol support in 002 story 002)
- **FR-17** Error handling and recovery → `005-tailored-cv-ui` (error codes in 001 story 002; timeout in 002 story 005)
- **FR-18** Profile Export / Import → `005-tailored-cv-ui`
- **FR-19** UI localization → `005-tailored-cv-ui`
- **FR-20** Model selection → `002-native-host` (model picker UI in 005 story 008)

## Unit Dependency Graph

```text
                 ┌──────────────────────┐
                 │ 001-cv-tailoring-core│  (scaffold + contracts first)
                 └──────────┬───────────┘
        ┌───────────────────┼────────────────────┬─────────────────────┐
        ▼                   ▼                    ▼                     │
┌───────────────┐  ┌──────────────────┐  ┌──────────────────┐          │
│002-native-host│  │003-job-ad-capture│  │004-cv-pdf-renderer│          │
└───────┬───────┘  └────────┬─────────┘  └────────┬─────────┘          │
        │  provider used by core pipeline ────────────────────────────►│
        └───────────────────┼─────────────────────┘                    │
                            ▼                                          ▼
                   ┌──────────────────┐
                   │005-tailored-cv-ui│
                   └──────────────────┘
```

There are no circular dependencies at bolt level: core contracts (bolt 002) come before the host; core AI steps (bolts 005–006) come after the host provider (bolt 004).

## Execution Order

1. Spike: Claude Code headless capabilities (host bolt 001)
2. Scaffold + contracts (core bolt 002)
3. Native host: protocol, install, health; then provider + PDF (bolts 003–004)
4. Core AI steps, then validator + pipeline + regression suite (bolts 005–006); **regression fixtures from the project author are needed before bolt 006**
5. In parallel with 4: job ad capture (bolts 007–008), PDF renderer (bolt 009)
6. UI: shell → onboarding → profile (bolt 010); generate → preview → errors (bolt 011); settings + export/import (bolt 012)
