---
unit: 001-cv-tailoring-core
intent: 001-one-click-tailored-cv
created: 2026-10-25T17:51:57Z
last_updated: 2026-10-28T19:08:38Z
---

# Construction Log: cv-tailoring-core

## Original Plan

**From Inception**: 3 bolts planned
**Planned Date**: 2026-10-25T12:00:00Z

| Bolt ID | Stories | Type |
|---------|---------|------|
| 002-cv-tailoring-core | 001-monorepo-scaffold, 002-domain-schemas-and-contracts | simple-construction-bolt |
| 005-cv-tailoring-core | 003-cv-profile-extraction, 004-job-requirements-parsing-and-cache, 005-tailoring-plan-generation | ddd-construction-bolt |
| 006-cv-tailoring-core | 006-deterministic-validator, 007-generation-pipeline-with-retry, 008-regression-fixture-suite | ddd-construction-bolt |

## Replanning History

| Date | Action | Change | Reason | Approved |
|------|--------|--------|--------|----------|

## Current Bolt Structure

| Bolt ID | Stories | Status | Changed |
|---------|---------|--------|---------|
| 002-cv-tailoring-core | 001-monorepo-scaffold, 002-domain-schemas-and-contracts | ✅ completed | - |
| 005-cv-tailoring-core | 003-cv-profile-extraction, 004-job-requirements-parsing-and-cache, 005-tailoring-plan-generation | ✅ completed | - |
| 006-cv-tailoring-core | 006-deterministic-validator, 007-generation-pipeline-with-retry, 008-regression-fixture-suite | ⏳ in-progress | - |

## Execution History

| Date | Bolt | Event | Details |
|------|------|-------|---------|
| 2026-10-25T17:51:57Z | 002-cv-tailoring-core | started | Stage 1: plan |
| 2026-10-25T17:57:36Z | 002-cv-tailoring-core | stage-complete | plan → implement |
| 2026-10-25T18:32:22Z | 002-cv-tailoring-core | stage-complete | implement → test |
| 2026-10-25T18:42:14Z | 002-cv-tailoring-core | completed | All 3 stages done (74/74 tests, user confirmed side panel) |
| 2026-10-25T20:13:51Z | 005-cv-tailoring-core | started | Stage 1: model |
| 2026-10-25T20:25:48Z | 005-cv-tailoring-core | stage-complete | model → design |
| 2026-10-27T17:39:31Z | 005-cv-tailoring-core | stage-complete | design → adr (skipped) → implement |
| 2026-10-27T18:50:08Z | 005-cv-tailoring-core | stage-complete | implement → test |
| 2026-10-27T19:03:07Z | 005-cv-tailoring-core | completed | All stages done; ADR skipped (411/411 tests, real-CLI smoke passed) |
| 2026-10-28T06:43:47Z | 006-cv-tailoring-core | started | Stage 1: model |
| 2026-10-28T07:05:27Z | 006-cv-tailoring-core | stage-complete | model → design |
| 2026-10-28T11:52:24Z | 006-cv-tailoring-core | stage-complete | design → adr (skipped) → implement |
| 2026-10-28T19:08:38Z | 006-cv-tailoring-core | stage-complete | implement → test |

## Execution Summary

| Metric | Value |
|--------|-------|
| Original bolts planned | 3 |
| Current bolt count | 3 |
| Bolts completed | 2 |
| Bolts in progress | 1 |
| Bolts remaining | 1 |
| Replanning events | 0 |

## Notes

- Inputs from spike 001-native-host (`memory-bank/bolts/001-native-host/spike-report.md`): add `MODEL_UNAVAILABLE` / `CLAUDE_VERSION_UNSUPPORTED`; fact fields nullable; explicit output language.
- 2026-10-29T07:18:51Z: Bolt 006 Stage 5, Haiku trial on the real set (6 CVs, 27 cases run; cv-06 cases pending review). Findings and fixes:
  - Missing employer: required `company` made the model write "unknown" → `company` optional, prompt forbids placeholders, `placeholderToNull` safety net (PL/EN/DE), PDF/editor/validator handle null.
  - Validator false positives: Polish locatives after "w" (Javie, Angularze, Scrumie, Pythonie) taken for companies (56/57 first-attempt company flags); spoken languages in the skills list flagged as skills → base-form candidates + language equivalents. Retries on the same plans: 18/27 → 7/27.
  - Fabrication leak: inflected unknown skills (w Kubernetesie, z Dockerem) passed as verified → skill mentions resolved through base forms. Regression tests added.
  - Tooling: `regression:review` ignored its target (silently reviewed nothing); live run crashed on a missing recordings/ folder → both fixed.
  - Haiku timings (before fixes): requirements median 9.4 s; tailoring median 50 s / p95 72 s; case median 59 s / p95 83 s.
