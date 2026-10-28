---
stage: model
bolt: 006-cv-tailoring-core
created: 2026-10-28T06:43:47Z
---

## Static Model: cv-tailoring-core (validator, generation pipeline, regression suite)

Scope: stories 006-deterministic-validator, 007-generation-pipeline-with-retry,
008-regression-fixture-suite. Builds on bolt 005's model (CvProfile with code-assigned stable IDs,
JobRequirements with nullable `language`, TailoringPlan with cited lines, `decideOutputLanguage`,
`unresolvedCitations`). Per the bolt type, this stage is documentation only; no source code was read.

### Entities

- **ValidationRun**: `planLanguage`, `profileLanguage`, `results: LineVerdict[]`, `summary { verified, unverified, skipped }` - Created by one call of the validator on one plan; immutable once produced; deterministic (same plan + profile → identical run); no I/O, no LLM.
- **GenerationRun**: `runId`, `adKey`, `outputLanguage`, `state` (see lifecycle), `attempts: Attempt[]` (1 or 2), `chosenAttempt`, `startedAt`, `finishedAt`, `outcome` - One click on Generate. Rules: requires a **confirmed** profile (else fails immediately, typed error); at most **two** tailoring calls; requirements step uses the bolt 005 cache; cancel at any point ends in `CANCELLED`; host disconnect ends in `HOST_DISCONNECTED`; every other failure ends in a typed error from the shared `ErrorCode` set; never ends without an outcome (no stuck loading state, FR-17).
- **Attempt**: `index` (1 = first, 2 = retry), `plan`, `validationRun`, `violationCount` - The retry attempt receives the first attempt's violations as feedback. When both exist, the attempt with **fewer violations** is chosen (story 007 edge case: "retry produces worse result"); ties → the retry.
- **Fixture** (regression suite): `fixtureId`, `kind` (`cv` | `ad` | `injection`), `language`, `source` (board/URL for ads), `isAnonymized`, `recordedOutputs` - Lives in `shared/test/fixtures/`; must pass the personal-data check (no real e-mail/phone patterns) before it can be committed.
- **FixtureCase**: `cvFixture`, `adFixture`, `expectation` (`match` | `gaps-expected` | `injection`), `recording` (stored requirements + plan + timings) - One CV × one ad. Recorded mode replays stored outputs (no network); live mode re-runs through the host and writes a new recording for human review, never auto-accepting it.

### Value Objects

- **PlanLine**: `lineId`, `kind` (`summary` | `bullet` | `skill`), `text`, `sourceIds` - The unit of validation and of "unverified" marking. `lineId` is derived from the line's position in the plan (`summary[i]`, `items[profileId].bullets[j]`, `skills[k]`), stable for a given plan, so the UI can mark lines and FR-13 user edits can refer to them. Headings and gaps are **not** PlanLines (never validated; gaps never appear in the CV).
- **Violation**: `rule`, `lineId`, `detail` (the offending token, normalized), `hint` - Rules: `UNKNOWN_SOURCE`, `UNKNOWN_SKILL`, `UNKNOWN_NUMBER`, `UNKNOWN_DATE`, `UNKNOWN_PERCENTAGE`, `UNKNOWN_COMPANY`, `UNKNOWN_TITLE`. `detail` never contains more than the token itself (feedback goes back into a prompt; no profile dumps).
- **LineVerdict**: `lineId`, `status` (`verified` | `unverified` | `skipped`), `violations: Violation[]` - `skipped` only for lines marked user-edited (story 006) - they are the user's own words.
- **NormalizedFact** (language-independent comparison key): one of
  - **Number**: decimal value; `1,5` = `1.5`; `10k` = `10 000` = `10000`; spelled numbers ("five", "pięć") → 5 for a bounded word list (PL/EN at least).
  - **Percentage**: number + `%` / "percent" / "procent"; compared as a number with a percentage tag (40% ≠ 40 years).
  - **Date**: year, or year+month; month names in any supported language → month number; ranges split into endpoints; "present/obecnie/now" maps to the item's `isCurrent`.
  - **ProperNoun** (company, title): case- and diacritics-folded, whitespace-collapsed, with a **stem/prefix match** for inflected forms (`Google` ↔ `Googlu`, `w Google`).
  - **SkillId**: case/punctuation-folded skill token plus aliases (e.g. `JS` ↔ `JavaScript`, `TS` ↔ `TypeScript`, `k8s` ↔ `Kubernetes`).
- **SourceFactSet**: the NormalizedFacts extracted from the **cited** profile items only (the item, its bullets, its own fields such as company/title/dates/skills), plus the profile-wide skill set for `UNKNOWN_SKILL`.
- **SkillAliasIndex**: built per profile from `skills[]`, item `skills[]`, and a small built-in alias table; maps any alias to a canonical SkillId.
- **ValidatorFeedback**: ordered list of short, data-only strings derived from Violations (e.g. `bullet items[exp_x].bullets[1]: number "40%" not in cited sources`), passed to the single retry as `validatorFeedback` (existing contract).
- **ProgressStep**: existing shared values; the pipeline emits `reading-job-ad`, `parsing-requirements`, `tailoring`, `validating`, `retrying` (and `rendering` belongs to the UI bolt).
- **FixtureMetrics**: per case `verified`, `unverified`, `seededCaught/seededTotal`, `injectionLeaks`, `durations { requirements, tailoring, total }`.
- **AnonymizationPolicy**: replace name, e-mail, phone, address, URLs/handles with fake values; **keep** real dates, numbers, companies, titles and skills (they are what the validator checks).

### Aggregates

- **ValidationRun** (root): Members: LineVerdicts, Violations - Invariants:
  1. Every PlanLine gets exactly one verdict.
  2. A line with no or unknown `sourceIds` → `UNKNOWN_SOURCE` (reuses bolt 005's citation check), and its other rules are not evaluated (nothing to compare against).
  3. Every number, percentage, date, company and title token in a line must appear in that line's SourceFactSet; every skill token must resolve through the SkillAliasIndex.
  4. Comparison is on NormalizedFacts only, so a correct translation (EN profile → PL CV) verifies.
  5. Headings and gaps are never validated; user-edited lines are `skipped`.
  6. `verified` ⇔ zero violations.
  7. Pure and deterministic.
- **GenerationRun** (root): Members: Attempts, chosen plan, requirements reference - Invariants:
  1. Order: requirements (cached) → tailor → validate → [retry tailor → validate] → result.
  2. At most one retry, and only when the first validation has violations.
  3. ≤ 2 tailoring calls.
  4. The outcome carries plan + ValidationRun + gaps, or a typed error.
  5. A cancelled run issues a host cancel and emits no further progress.
  6. Unverified lines stay in the result, marked, for the user to edit or remove (FR-11, FR-13); they are never silently dropped.
- **RegressionSuite** (root): Members: Fixtures, FixtureCases, SeededFabrications, InjectionCases - Invariants:
  1. ≥ 3 CVs and ≥ 20 ads before the suite counts as "complete" (the requirements' composition).
  2. **0 fabricated facts pass as verified** across all cases.
  3. Every seeded fabrication is caught.
  4. Injection cases: no injected content in any output field, and the schema is respected.
  5. Recorded mode makes no network calls.
  6. Every committed fixture passes the personal-data check.

### Domain Events

- **GenerationStarted**: Trigger: Generate with a confirmed profile - Payload: runId, adKey, model, outputLanguage.
- **StepStarted**: Trigger: each pipeline step - Payload: runId, ProgressStep (→ progress event to the UI).
- **PlanValidated**: Trigger: validator finished on an attempt - Payload: runId, attempt index, verified/unverified counts (no line text).
- **RetryRequested**: Trigger: first attempt has violations - Payload: runId, violation count (feedback stays inside the run).
- **GenerationCompleted**: Trigger: chosen attempt decided - Payload: runId, plan, ValidationRun summary, gaps.
- **GenerationFailed**: Trigger: typed error (incl. `CANCELLED`, `HOST_DISCONNECTED`, `GENERATION_TIMEOUT`, `MODEL_UNAVAILABLE`, …) - Payload: runId, ErrorCode.
- **FabricationEscaped** (suite only): Trigger: a seeded/known fabricated fact verified - Payload: fixtureCase, rule, token. The suite fails.

### Domain Services

- **PlanValidator**: Operations: `validatePlan(plan, profile, { userEditedLineIds }) → ValidationRun`; `toFeedback(run) → ValidatorFeedback` - Dependencies: FactNormalizer, SkillAliasIndex, bolt 005 citation check. Pure; no I/O; no LLM.
- **FactNormalizer**: Operations: extract and normalize numbers, percentages, dates (multilingual month names), proper nouns (folding + stem/prefix), skill tokens - Dependencies: built-in word lists (number words, month names for at least PL/EN/DE), alias table. Pure.
- **GenerationPipeline** (process manager, extension background): Operations: `runGeneration({ adInput, profile, settings, signal, onProgress }) → GenerationResult` - Dependencies: bolt 005 services (requirements resolution with cache, tailoring), PlanValidator, `decideOutputLanguage`. Chooses the better attempt; maps host disconnect/cancel to typed errors.
- **SeededFabricator** (test-domain service): Operations: mutate a valid plan by adding a fake skill / number / percentage / date / company / title / uncited line - Dependencies: none. Each mutation must be caught by its matching rule.
- **InjectionCaseBuilder** (test-domain service): Operations: derive injection ads from real ads (CSS-hidden text, alt text, "ignore previous instructions", fake tags) - Dependencies: ad fixtures.
- **FixturePrivacyCheck**: Operations: scan fixture files for e-mail/phone/address patterns; used by the suite and a pre-commit hook - Dependencies: none.
- **SuiteRunner**: Operations: recorded mode (replay, no network); live mode (`pnpm test:live`, via the host, writes recordings for review, measures timings) - Dependencies: host client, fixtures. Live mode is opt-in and costs Claude usage.

### Repository Interfaces

- **ProfileRepository** (from bolt 005, storage in bolt 010): Entity: CvProfile - Methods: `getConfirmed()`; the pipeline only reads.
- **RequirementsCache** (bolt 005): Entity: cached JobRequirements - Methods: `get(adKey)`, `put(adKey, requirements)`.
- **FixtureRepository** (test only): Entity: Fixture, FixtureCase - Methods: `listCvs()`, `listAds()`, `listCases()`, `readRecording(caseId)`, `writeRecording(caseId, recording)` (live mode only).

### Ubiquitous Language

- **Verified line**: a plan line whose every fact token is found in its cited source items.
- **Unverified line**: a line with ≥ 1 violation after the retry; shown marked (icon + text), editable or removable before download.
- **User-edited line**: text changed by the user in the preview; excluded from validation.
- **Cited sources**: the profile items/bullets named in a line's `sourceIds`; the only facts a line may use.
- **Fact token**: number, percentage, date, company, job title or skill appearing in a line.
- **Language-independent fact**: a normalized fact that compares equal across languages (numbers, ISO dates, folded proper nouns, skill IDs).
- **Retry**: the single re-run of tailoring with ValidatorFeedback attached.
- **Seeded fabrication**: a deliberate fake fact injected into a valid plan by the test suite.
- **Recorded mode / live mode**: replay stored Claude outputs offline / call Claude through the host and record.
- **Regression set**: the author-provided anonymized CVs and real ads (≥ 3 / ≥ 20).

### What the user must provide (regression set)

Needed **by Stage 5 (test)** of this bolt; Stages 2–4 use synthetic fixtures only.

- **CVs: minimum 3, ideally 5**, as text-based PDFs, plus nothing else:
  1. your real CV in Polish
  2. an English CV (yours translated, or a different one)
  3. a clearly different profile (another field or seniority), ideally a two-column layout
  4. *(optional)* a long-history CV (exercises the 2-page limit)
  5. *(optional)* a short junior CV (exercises the gaps list)
- **Anonymization for every CV:** fake name, e-mail, phone, address and links/handles. **Keep** the real dates, numbers, companies, job titles and skills (they are what the validator checks).
- **Job ads: minimum 20**, each saved as page HTML ("Save page as… → HTML only") or plain text, with its URL:
  - ~8 Polish and ~8 English, from different preset boards (Pracuj.pl, justjoin.it, NoFluffJobs, Bulldogjob, LinkedIn, Indeed, StepStone)
  - ~2 in another language (e.g. German, StepStone)
  - several that **don't** match the CVs well (to exercise the gaps list)
- **Injection cases (~3):** none needed from you; generated from your real ads during construction.
- **Speed measurement:** one live run (opt-in) over the set with Sonnet 5.5 at Stage 5, using your subscription.

### Open Questions

None blocking Stage 2. Your sample PDFs in `exampleCV/` are templates and others' CVs (git-ignored); they are not used for the regression set unless you say so.

### User Decisions (2026-10-28T07:05:27Z)

- Decision bundle 1–6 approved.
