---
unit: 001-cv-tailoring-core
intent: 001-one-click-tailored-cv
phase: inception
status: complete
unit_type: domain
default_bolt_type: ddd-construction-bolt
created: '2026-10-25T12:00:00Z'
updated: '2026-10-25T12:00:00Z'
---

# Unit Brief: 001-cv-tailoring-core

## Purpose

The domain heart of cv-snap: data contracts, prompts, the anti-hallucination validator, and the generation pipeline. Mostly pure TypeScript in `shared/`, with the pipeline orchestrator in the extension background worker.

## Scope

### In Scope
- pnpm monorepo scaffold (`extension/`, `native-host/`, `shared/`) with lint, format, test tooling
- zod schemas: CV profile, job requirements, tailoring plan, native messages, error codes, provider interface
- Prompt builders for profile extraction, requirements parsing, tailoring (with data delimiting)
- Deterministic validator (pure function) and the retry policy
- Pipeline orchestrator: extract → requirements (cached) → tailor → validate → retry → result
- Regression fixture suite (fabrication + injection cases)

### Out of Scope
- Running Claude (002-native-host)
- Capturing the ad from the page (003-job-ad-capture)
- PDF output (004-cv-pdf-renderer)
- Any UI (005-tailored-cv-ui)

---

## Assigned Requirements

**These FRs from the intent are assigned to this unit. Stories are created from these.**

| FR | Requirement | Priority |
|---|---|---|
| FR-4 | Structured CV profile creation | Must |
| FR-9 | Job requirements parsing and caching | Must |
| FR-10 | Tailored CV generation | Must |
| FR-11 | Deterministic validation and retry | Must |
| FR-12 | Output language (any language, follows the ad) | Must |

---

## Domain Concepts

### Key Entities
| Entity | Description | Attributes |
|---|---|---|
| CvProfile | User-reviewed source of facts | id, sourceLanguage, contact, summary, experience[], projects[], education[], skills[], languages[], certifications[], photoRef?, schemaVersion |
| ProfileItem / Bullet | A single fact-bearing unit with a stable ID | id, text, dates?, company?, title?, skills[] |
| JobRequirements | Structured view of an ad | url, title, company, location, mustHaves[], niceToHaves[], keywords[], seniority, language (ISO 639-1) |
| TailoringPlan | What the CV will say, with citations | items[{profileId, rank, bullets[{text, sourceIds[]}]}], summary[{text, sourceIds[]}], skills[{name, sourceIds[]}], headings{}, gaps[], language |
| ValidationResult | Validator verdict per line | lineId, status (verified|unverified), violations[{rule, detail}] |

### Key Operations
| Operation | Description | Inputs | Outputs |
|---|---|---|---|
| buildProfilePrompt / parseProfile | Text → CvProfile | extracted PDF text | CvProfile (validated) |
| parseRequirements | Ad text → JobRequirements (cached 7 days per URL) | ad text, url | JobRequirements |
| tailor | Profile + requirements → TailoringPlan | CvProfile, JobRequirements, outputLanguage | TailoringPlan |
| validatePlan | Deterministic fact check | TailoringPlan, CvProfile | ValidationResult[] |
| runGeneration | Orchestrate the full pipeline with one retry | ad input, profile, settings | GenerationResult + progress events |

---

## Story Summary

- **Total Stories**: 8
- **Must Have**: 8
- **Should Have**: 0
- **Could Have**: 0

### Stories

- [ ] **001-monorepo-scaffold**: Monorepo scaffold - Must - Planned
- [ ] **002-domain-schemas-and-contracts**: Domain schemas and contracts - Must - Planned
- [ ] **003-cv-profile-extraction**: CV profile extraction - Must - Planned
- [ ] **004-job-requirements-parsing-and-cache**: Job requirements parsing and cache - Must - Planned
- [ ] **005-tailoring-plan-generation**: Tailoring plan generation - Must - Planned
- [ ] **006-deterministic-validator**: Deterministic validator - Must - Planned
- [ ] **007-generation-pipeline-with-retry**: Generation pipeline with retry - Must - Planned
- [ ] **008-regression-fixture-suite**: Regression fixture suite - Must - Planned

---

## Dependencies

### Depends On
| Unit | Reason |
|---|---|
| None | Foundation unit |

### Depended By
| Unit | Reason |
|---|---|
| 002-native-host | Uses message contracts and provider interface |
| 003-job-ad-capture | Uses ad input types |
| 004-cv-pdf-renderer | Renders TailoringPlan + CvProfile |
| 005-tailored-cv-ui | Drives the pipeline, shows results |

### External Dependencies
| System | Purpose | Risk |
|---|---|---|
| Claude (via 002-native-host) | All AI steps | High |

---

## Technical Context

### Suggested Technology
TypeScript strict, zod, Vitest. Validator and prompt builders are pure functions in `shared/`. Pipeline runs in the extension background worker and talks to the host via the provider interface.

### Integration Points
| Integration | Type | Protocol |
|---|---|---|
| 002-native-host | Native messaging port | length-prefixed JSON |
| 005-tailored-cv-ui | In-extension messaging | chrome.runtime messages |

### Data Storage
| Data | Type | Volume | Retention |
|---|---|---|---|
| Requirements cache | chrome.storage.local | ≤ a few hundred entries | 7 days per URL |
| Active profile / draft | chrome.storage.local | 1–2 docs | Until replaced |

---

## Constraints

- Validator must not call any LLM
- Ad text always passed as delimited data, never as instructions
- Plan JSON must stay well under 1 MB

---

## Success Criteria

### Functional
- [ ] Profile, requirements, and plan outputs always pass schema validation or fail with a typed error
- [ ] Validator rejects every fabrication class listed in FR-11
- [ ] Pipeline retries at most once and marks remaining failures as unverified

### Non-Functional
- [ ] 0 fabricated facts pass as verified on the regression set
- [ ] Injection fixtures cause no behavior change
- [ ] Generation ≤ 60 s p95 with Sonnet 5.5

### Quality
- [ ] Code coverage ~80% (shared/native-host) or most important user flows covered (extension), per coding standards
- [ ] All acceptance criteria met
- [ ] Code reviewed and approved

---

## Bolt Suggestions

| Bolt | Type | Stories | Objective |
|---|---|---|---|
| 002-cv-tailoring-core | simple-construction-bolt | 001-monorepo-scaffold, 002-domain-schemas-and-contracts | Create the pnpm monorepo with all tooling and the shared contracts every other unit builds on. |
| 005-cv-tailoring-core | ddd-construction-bolt | 003-cv-profile-extraction, 004-job-requirements-parsing-and-cache, 005-tailoring-plan-generation | Model and implement the three AI steps: profile extraction, requirements parsing (with cache), and cited tailoring plans in the ad's language. |
| 006-cv-tailoring-core | ddd-construction-bolt | 006-deterministic-validator, 007-generation-pipeline-with-retry, 008-regression-fixture-suite | Deterministic anti-hallucination validator, pipeline orchestration with one retry, and the regression suite proving 0 fabrications. |

---

## Notes

The regression fixture set (≥ 3 CVs, ≥ 20 ads) is provided by the project author before bolt 006. Spike results from host bolt 001 may adjust how structured output is requested.
