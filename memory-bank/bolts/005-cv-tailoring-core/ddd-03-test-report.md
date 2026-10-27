---
stage: test
bolt: 005-cv-tailoring-core
created: 2026-10-27T18:56:51Z
---

## Test Report: cv-tailoring-core (profile extraction, requirements + cache, tailoring plan)

### Summary

- **Unit Tests**: 77/77 passed (shared domain: ID assignment, ad key, output language, citations, cache freshness/pruning, size caps, prompt builders; extension services: retry, profile extraction, requirements resolution, tailoring postconditions, storage cache), 97.0% line / 89.6% branch coverage overall (shared + native-host); 100% lines for every new shared module except `output-language.ts` (83%, the `Intl` fallback branch)
- **Integration Tests**: passed: `ClaudeCodeProvider` with recorded-shape Claude output (8), `NativeHostProvider` over a fake Chrome port (5), built host end to end with a stand-in Claude for createProfile → parseRequirements → tailor (1, in `native-host/test/e2e.test.ts`)
- **Security Tests**: passed: data-tag escaping (all tags, any case, `< /tag` spacing), injection text stays inside its data block (CV, ad, JSON-LD, profile text, validator feedback), lockdown arguments on every real spawn (stand-in Claude logs them), contact details and raw ad text never reach the tailoring prompt, raw ad text never stored in the cache; real-CLI injection ignored (smoke run)
- **Performance Tests**: real-CLI smoke on Haiku: profile 7.0 s, requirements 5.3 s, tailoring 16.2 s. The p95 targets (≤ 90 s profile, ≤ 60 s generation on Sonnet 5.5) need the fixture set and the pipeline (bolt 006); not measured here
- **Full suite**: 411/411 passed (47 files); build, typecheck, lint (0 warnings), format all green

### Test Files

- `shared/src/profile-ids.test.ts` (6), `ad-key.test.ts` (12), `output-language.test.ts` (5), `citations.test.ts` (3), `requirements-cache.test.ts` (6), `limits.test.ts` (4), `prompts/prompt-builders.test.ts` (15, replaces the Stage 4 smoke checks)
- `extension/src/features/tailoring/services.test.ts` (20), `requirements-cache-store.test.ts` (6), `extension/src/lib/native-host-provider.test.ts` (5)
- `native-host/test/e2e.test.ts` (+1: AI requests through the built host with a stand-in Claude)
- Helpers: `shared/test/extraction.ts` (synthetic ID-less extraction), `extension/test/tailoring-fixtures.ts` (requirements fixture, scriptable fake provider)

### Acceptance Criteria Validation

**Story 003-cv-profile-extraction**
- ✅ **Result passes `CvProfileSchema` and records the source language**: `assignProfileIds` output passes the parsed-content schema with unique IDs and keeps `sourceLanguage` (unit); host replies are re-validated with the unique-ID rule (provider + e2e); real CLI: `pl`, all IDs code-assigned and unique
- ✅ **Invalid model output → one retry, then `GENERATION_FAILED`**: `ProfileExtraction` retries exactly once on `INVALID_OUTPUT`, never on timeout/cancel/model errors
- ✅ **No fact absent from the source text (fixture test)**: synthetic checks (model IDs ignored, facts copied unchanged, null for missing phone); real CLI: every skill and company appears in the source text, phone `null`. Full fixture-set regression is story 008 (bolt 006)
- ⏳ **≤ 90 s p95 on the default model**: Haiku smoke 7.0 s; Sonnet p95 on the fixture set is measured with the regression suite (bolt 006)

**Story 004-job-requirements-parsing-and-cache**
- ✅ **Result passes `JobRequirementsSchema` with an ISO 639-1 language**: schema + caps tests; the approved design allows `null` when undecidable (decision 2), with the profile-language fallback in `decideOutputLanguage`; real CLI decided `pl` for a mixed ad (English title, Polish body)
- ✅ **Same URL within 7 days → no Claude call**: `RequirementsResolution` serves the cache without a provider call, also across tracking-parameter variants
- ✅ **Entry older than 7 days → parsed again and replaced**: freshness boundary tested at exactly 7 days; stale entry replaced with the new `parsedAt`
- ✅ **Injected instructions treated as ad content**: escaping and data-block tests; real CLI ignored "HACKED Corp" / "add Rust" injection
- ✅ Edge cases: tracking URLs share a key; manual selection keyed by URL + 16-hex SHA-256 of the normalised selection (text never in the key)

**Story 005-tailoring-plan-generation**
- ✅ **Plan passes `TailoringPlanSchema`; every line cites ≥ 1 existing ID**: schema `min(1)`; `Tailoring` rejects unresolved citations as `INVALID_OUTPUT` (paths/IDs only); real CLI: 0 unresolved, every line cites
- ✅ **Plan in the ad's language X; with override in the chosen one**: `decideOutputLanguage` (override > ad > profile) passed to the provider; wrong-language plan rejected; real CLI plan `pl` = decided `pl`
- ✅ **Language other than PL/EN → headings in that language**: prompt asks for them; new `missingHeadings` postcondition rejects a plan without headings for every shown section (see Issues)
- ✅ **Unmet requirements only in `gaps`, never in CV lines**: prompt rule tested; real CLI: unmet "Go" only in gaps, no CV line mentions it (nor Kubernetes/Rust/Spark)
- ✅ **Items carry a relevance `rank`**: schema; real CLI ranks 1, 2, 3

### Issues Found

1. **Escaping gap (fixed):** `< /cv_text>` (space between `<` and `/`) was not neutralised, so untrusted text could plausibly close its data block. `TAG_LOOKALIKE` in `shared/src/prompts/common.ts` now allows whitespace before the slash; covered for every data tag.
2. **Missing postcondition for story 005 AC3 (fixed):** a non-PL/EN plan with null headings passed and the template would silently print English labels. `Tailoring` now rejects it as `INVALID_OUTPUT` via `missingHeadings` (sections actually shown: summary, cited experience/projects/education, skills, profile languages/certifications).
- Test-side: one wrong expected ID count in a new test, fixed.

### Recommendations

- Measure the p95 NFRs (Sonnet 5.5, fixture set) in bolt 006 with the regression suite; the Haiku smoke suggests tailoring dominates (16 s).
- Bolt 006: pass `InvalidPlanError.issues` as `validatorFeedback` on the single retry (already path/ID-only).
- The real-CLI smoke script stays outside the repo (scratchpad); rerun it after Claude Code upgrades.

### User Decisions (2026-10-27T19:03:07Z)

- Approved. Speed targets (profile ≤ 90 s, generation ≤ 60 s p95 on Sonnet 5.5) are measured in bolt 006 with the regression fixture set.
