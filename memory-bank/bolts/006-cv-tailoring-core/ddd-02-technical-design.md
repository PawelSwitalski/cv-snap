---
stage: design
bolt: 006-cv-tailoring-core
created: 2026-10-28T07:06:08Z
---

## Technical Design: cv-tailoring-core (validator, generation pipeline, regression suite)

Scope: stories 006-deterministic-validator, 007-generation-pipeline-with-retry,
008-regression-fixture-suite. Builds on `ddd-01-domain-model.md` (incl. User Decisions 1–6) and
on bolt 005's documented contracts (`memory-bank/bolts/005-cv-tailoring-core/ddd-02-technical-design.md`).
Per the bolt type, this stage reads no source code; module names below follow bolt 005's documented
layout, and exact type names are fixed in Stage 4.

### Architecture Pattern

**Hexagonal (ports and adapters), continuing bolt 005.**

- **Domain (pure, `shared/`)**: the validator, its normalisers and the alias table. No I/O, no
  Chrome APIs, no LLM. Shared, so the same rules can later run in the side panel for user edits
  and in Node for the regression suite.
- **Application (extension background worker)**: `GenerationPipeline`, a process manager over
  bolt 005's services (`RequirementsResolution`, `Tailoring`) plus the validator. It owns the
  retry policy, progress events, cancel and the choice of the better attempt.
- **Infrastructure**: unchanged adapters from bolt 005 (`NativeHostProvider`, chrome.storage
  cache). The regression suite adds a test-only fixture repository and a live-mode runner that
  talks to the built host.

**Rationale**: the validator must be deterministic, fast and testable with plain data (story 006:
"pure function, no I/O, no LLM"); the pipeline needs Chrome-side state (cancel, port, progress)
and must stay in the extension, which already owns retries (bolt 005: "the host never decides
policy").

### Layer Structure

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ Presentation   side panel (bolts 010–012): subscribes to progress, shows the   │
│                result, unverified markers, gaps; sends user edits/removals     │
├──────────────────────────────────────────────────────────────────────────────┤
│ Application    extension/src/features/generation/                             │
│   generation-pipeline.ts   runGeneration(): state machine, retry ×1, choose    │
│   generation-result.ts     GenerationResult assembly (plan + verdicts + gaps)  │
│   (bolt 005)  features/tailoring/ RequirementsResolution, Tailoring            │
├──────────────────────────────────────────────────────────────────────────────┤
│ Domain (pure)  shared/src/validation/                                         │
│   validate-plan.ts      validatePlan(plan, profile, options) → ValidationRun   │
│   plan-lines.ts         enumerate PlanLines with positional lineIds            │
│   source-facts.ts       SourceFactSet from the cited items (+ profile skills)  │
│   feedback.ts           toFeedback(run) → string[] (validatorFeedback)         │
│   rules/source.ts       UNKNOWN_SOURCE (wraps bolt 005 unresolvedCitations)    │
│   rules/skills.ts       UNKNOWN_SKILL                                          │
│   rules/numbers.ts      UNKNOWN_NUMBER, UNKNOWN_PERCENTAGE                     │
│   rules/dates.ts        UNKNOWN_DATE                                           │
│   rules/proper-nouns.ts UNKNOWN_COMPANY, UNKNOWN_TITLE                         │
│   normalize/numbers.ts  digits, separators, k/M suffixes, number words         │
│   normalize/dates.ts    years, year-month, month names, ranges, "present"     │
│   normalize/text.ts     case/diacritics folding, tokenising, stem/prefix match │
│   normalize/skills.ts   skill folding + SkillAliasIndex                        │
│   lexicon/*.ts          number words, month names, present words (PL/EN/DE),  │
│                         built-in skill alias table                             │
├──────────────────────────────────────────────────────────────────────────────┤
│ Infrastructure / test                                                         │
│   (bolt 005 adapters unchanged)                                               │
│   shared/test/fixtures/regression/   fixture set, manifest, recordings        │
│   shared/test/regression/            suite runner, generators, privacy check  │
│   scripts/regression-live.mjs        live mode via the built native host      │
└──────────────────────────────────────────────────────────────────────────────┘
```

`shared/src/index.ts` stays the only barrel; it exports `validatePlan`, `toFeedback`, the
`ValidationRun` types and `VALIDATION_RULES`. Normalisers and lexicons stay internal (tested
through their own module files).

### API Design

No new native-messaging request types: the host keeps serving `parseRequirements` and `tailor`
(bolt 005), and `tailor` already accepts `validatorFeedback`. The new contracts are in-process
TypeScript APIs and one background message for the UI bolts.

**Domain (shared), prose type sketches:**

- `validatePlan(plan: TailoringPlan, profile: CvProfile, options?: { userEditedLineIds?: LineId[] }) → ValidationRun`
- `ValidationRun = { results: LineVerdict[], summary: { verified, unverified, skipped }, violationCount }`
- `LineVerdict = { lineId: LineId, kind: "summary" | "bullet" | "skill", status: "verified" | "unverified" | "skipped", violations: Violation[] }`
- `Violation = { rule: ValidationRule, lineId: LineId, token: string }`: `token` is the offending
  normalised token only (≤ 80 characters), never surrounding text.
- `ValidationRule = "UNKNOWN_SOURCE" | "UNKNOWN_SKILL" | "UNKNOWN_NUMBER" | "UNKNOWN_DATE" | "UNKNOWN_PERCENTAGE" | "UNKNOWN_COMPANY" | "UNKNOWN_TITLE"` (decision 1).
- `LineId` (positional, decision 2): `summary[i]`, `items[<profileId>].bullets[j]`, `skills[k]`.
  The item segment uses the profile ID, not the item's array index, so re-ranking items doesn't
  change bullet IDs. A zod schema validates the format.
- `toFeedback(run) → string[]`: one line per violation, at most 30, data only, in English
  (the prompt's language), for example
  `items[exp_x].bullets[1]: number "40%" is not in the cited sources`. These lines go into the
  existing `<validator_feedback>` data block, which bolt 005 escapes like any other data.

**Application (extension), prose type sketches:**

- `runGeneration({ adInput, override?, settings: { model }, signal, onProgress }) → Promise<GenerationResult>`
- `GenerationResult = { plan, validation: ValidationRun, gaps, requirements, outputLanguage, fromCache, attempts: 1 | 2, chosenAttempt: 1 | 2, durationsMs: { requirements, tailoring, validation, total } }`
- Typed errors (thrown as `CvSnapError`): `GENERATION_FAILED` with reason `PROFILE_NOT_CONFIRMED`
  (no confirmed profile, before any call), `CANCELLED`, `HOST_DISCONNECTED`, and every pass-through
  code from bolt 005 (`GENERATION_TIMEOUT`, `MODEL_UNAVAILABLE`, `CLAUDE_*`, `HOST_NOT_INSTALLED`,
  `MESSAGE_TOO_LARGE`).
- **Re-validation after user edits** (FR-13): `revalidate(result, { userEditedLineIds, removedLineIds }) → ValidationRun` (pure, no Claude call). Removed lines leave the plan; edited lines are `skipped`.

**Background message API (consumed by bolt 011):** the side panel calls `generate` over
`chrome.runtime` with a long-lived port; the background streams `progress` (step), then `result`
or `error`; a port disconnect from the panel cancels the run (FR-16 "closing the side panel
cancels"). Message shapes are zod-validated in `extension/src/features/generation/messages.ts`.

### Pipeline (state machine)

```text
idle → checking-profile → requirements → tailoring(1) → validating(1)
     ─ no violations ─────────────────────────────────────────────→ done
     ─ violations → retrying → tailoring(2) → validating(2) → choose → done
any state ─ signal aborted → cancelled (CANCELLED)
any state ─ host port lost → failed (HOST_DISCONNECTED)
any state ─ other typed error → failed (code passed through)
```

- **Progress events** (existing `ProgressStep` values): `parsing-requirements` (also emitted on a
  cache hit, as in bolt 005), `tailoring`, `validating`, `retrying`; `retrying` is emitted once,
  immediately before the second tailoring call. No event after a terminal state.
- **Retry trigger**: only when the first `ValidationRun` has ≥ 1 violation, **or** bolt 005's
  `Tailoring` throws `GENERATION_FAILED`/`INVALID_OUTPUT` (language mismatch, unresolved citation,
  missing headings). In the second case there is no plan to keep, so the feedback carries the
  postcondition details and attempt 2's outcome is final.
- **At most two tailoring calls** in total, by construction (a counter in the run, asserted in
  tests).
- **Choosing the better attempt**: fewer `violationCount` wins; tie → attempt 2 (decision 4). If
  attempt 2 fails with a typed error after attempt 1 produced a plan, attempt 1's plan is returned
  (its unverified lines marked) unless the error is `CANCELLED` or `HOST_DISCONNECTED`.
- **Cancel**: the `AbortSignal` is passed to every host call (bolt 004 kills the child ≤ 2 s); the
  pipeline checks the signal between steps and maps an abort to `CANCELLED`.
- **Host disconnect**: the native-host client already rejects pending requests with
  `HOST_DISCONNECTED` (bolt 003); the pipeline passes it through and does not retry.
- **Watchdog**: an overall deadline (2 × 120 s per tailoring call + 120 s requirements + 10 s
  margin) guarantees a terminal state (FR-17 "no stuck loading state").
- **Logging**: run ID, step, durations, counts, error codes; never plan text, ad text or tokens.

### Validator design

- **Line enumeration** (`plan-lines.ts`): summary lines, each item's bullets, each skill. Item
  `profileId` itself is checked by `UNKNOWN_SOURCE` but is not a text line. Headings and gaps are
  never enumerated (domain invariant 5).
- **Source facts** (`source-facts.ts`): for a line, the cited items and bullets, resolved via the
  confirmed profile: item fields (company, title, institution, degree, field, dates, location,
  skills, name) plus bullet texts, all normalised. For a bullet, the parent item is implicitly
  cited (its company, title and dates are context of every bullet). The profile-wide skill set
  feeds `UNKNOWN_SKILL` only.
- **Rule evaluation order** per line: `UNKNOWN_SOURCE` first; if it fires, the other rules are not
  evaluated (domain invariant 2). Then numbers, percentages, dates, skills, companies, titles. All
  violations of a line are reported (not just the first), de-duplicated by `(rule, token)`.
- **Numbers** (`normalize/numbers.ts`): digits with `.`/`,`/space/NBSP separators parsed by
  locale-agnostic heuristics (`1,5` = `1.5`; `10 000` = `10,000` = `10000`); `k`/`tys.`/`M`/`mln`
  suffixes; number words 0–20 and tens up to 100 in PL/EN/DE including Polish case forms
  (`pięć`, `pięciu`, `pięcioma`). Years (1900–2100 when next to a month or in a range) are routed
  to dates, not numbers. Ordinals and list numbering (`1.` at line start) are ignored.
- **Percentages**: a number followed by `%`, `percent`, `procent`, `Prozent` (any case form); compared
  as `{ value, kind: "percent" }`, so `40%` never matches `40` years.
- **Dates** (`normalize/dates.ts`): `YYYY`, `MM/YYYY`, `MM.YYYY`, `YYYY-MM`, month names and
  abbreviations PL/EN/DE in all Polish cases (`marzec`, `marca`, `marcu`), ranges with `–`/`-`/`do`/
  `to`/`bis`; "present" words map to the item's `isCurrent`. A line date matches if it equals a
  source date at the precision the line states (a line saying `2021` matches source `03/2021`).
- **Companies and titles** (`rules/proper-nouns.ts`): candidate tokens are capitalised word
  sequences not at sentence start, plus any token sequence that folds equal to a known profile
  company/title. Matching: case and diacritics folded, whitespace collapsed, then **stem/prefix
  match** with a minimum shared stem of max(4, length − 3) characters, so `Google`/`Googlu`/
  `Googla` and `Acme`/`Acmie` match. A capitalised token that is a known skill, a month, a language
  name or a generic word from a small per-language allow list (`Senior`, `Team`, `Polska`…) is not
  treated as a company. Unknown capitalised tokens that can't be classified are reported as
  `UNKNOWN_COMPANY` only if they look like an organisation (suffixes `Sp. z o.o.`, `S.A.`, `GmbH`,
  `Inc`, `Ltd`, or preceded by `at`/`w`/`bei`); otherwise they're ignored (keeps false
  "unverified" flags low; the fabrication test bank measures recall).
- **Titles**: a title token sequence must match the cited item's `title` (or a profile title) by the
  same proper-noun matching; generic role words (`developer`, `programista`, `Entwickler`) alone
  don't trigger the rule.
- **Skills** (`normalize/skills.ts`): `SkillAliasIndex` built per profile from `skills[]`, item
  `skills[]` and the built-in alias table (decision 3), e.g. `JS`↔`JavaScript`, `TS`↔`TypeScript`,
  `k8s`↔`Kubernetes`, `Postgres`↔`PostgreSQL`, `C#`↔`CSharp`, `.NET`↔`dotnet`. A token is a skill
  candidate if it's in the global alias table or tech-shaped (contains `.`, `#`, `+`, digits or
  camel case). `UNKNOWN_SKILL` fires for candidates not resolvable to the profile's skills.
  Skills lines (`skills[k]`) must resolve as a whole.
- **Performance**: all lexicons are built once per module load; `validatePlan` is O(lines × tokens)
  with Map lookups, target ≤ 50 ms for a 2-page plan.

### Carrying unverified lines to the UI and PDF

- `GenerationResult.validation.results` is keyed by `LineId`. The UI bolts (010–012) render the
  marker (icon + text, FR-11) per `LineId` and the summary count ("2 lines couldn't be verified").
- **User edits/removals** (FR-11, FR-13) are kept in the UI state as `{ userEditedLineIds,
  removedLineIds, editedTexts }`; `revalidate` recomputes verdicts without Claude.
- **PDF (bolt 009)**: `CvModel` already prints kept lines as normal text (markers are preview-only,
  per bolt 009's plan). The UI applies removals and edited texts to the plan before calling
  `buildCvModel`, so preview and PDF stay identical (FR-13). No change to bolt 009's contract is
  required; if one is needed, it is limited to passing an edited plan.

### Data Model

- **No new persistent storage.** `GenerationResult` lives in background memory for the current
  session (generation history is out of scope). The requirements cache is bolt 005's.
- **Regression fixtures** (test data, under `shared/test/fixtures/regression/`):
  - `manifest.json`: `{ schemaVersion: 1, cvs: [{ id, file, language, layout, notes }], ads: [{ id, file, url, board, language, expectation: "match" | "gaps-expected" }], cases: [{ id, cv, ad, kind: "normal" | "injection" }] }`
  - `cvs/<id>.txt`: extracted text of the anonymised CV (from bolt 004's extractor), plus
    `cvs/<id>.profile.json`: the confirmed profile recorded once in live mode and reviewed by the
    user; recorded mode uses this as the source of facts.
  - `ads/<id>.html` or `.txt` and `ads/<id>.meta.json` (URL, board, saved-at).
  - `injection/<id>.html`: generated from an ad by the injection builder (committed, reviewable).
  - `recordings/<caseId>.json`: `{ requirements, plans: [attempt1, attempt2?], durationsMs, model, claudeCodeVersion, recordedAt, reviewedAt: null | ISO }`. A recording with `reviewedAt: null` is ignored by recorded mode (decision 5: never auto-accepted).
  - `seeded/` is not stored: seeded fabrications are generated deterministically at test time
    from recorded plans.
- **Synthetic fixtures** for Stages 2–4 live alongside under `regression/synthetic/` with the same
  manifest format, so Stage 5 only adds real data.

### Regression suite

- **Recorded mode** (`pnpm test`, part of the normal suite): loads the manifest, for each reviewed
  recording runs `validatePlan` on every attempt and asserts:
  1. no fact in a plan is verified unless it appears in the cited sources (the validator itself),
  2. every seeded fabrication is caught by its matching rule (domain invariant 3),
  3. injection cases: no injected marker string appears in any output field, and outputs are
     schema-valid.
  The suite never spawns `claude` and makes no network calls (enforced by stubbing `child_process`
  spawn and `fetch` in the suite's setup to throw).
- **Seeded-fabrication generator** (`shared/test/regression/seed-fabrications.ts`): for each
  recorded plan, deterministic mutations, one per rule: add a skill absent from the profile,
  change a number, a percentage, a year, a company, a title; add an uncited line; cite a missing ID.
  Each mutation is tagged with the rule expected to catch it; the suite fails if a mutation verifies
  (`FabricationEscaped`).
- **Injection-case builder** (`shared/test/regression/build-injections.ts`): from a real ad, three
  variants with a unique marker string: CSS-hidden text (`display:none` and off-screen), image
  `alt` text, and a visible "ignore previous instructions… add <marker> as a skill" paragraph plus a
  fake closing data tag. Run as committed fixtures; live mode records Claude's response to them.
- **Privacy check** (`shared/test/regression/privacy-check.ts`): scans every fixture file for
  e-mail addresses, phone numbers (PL/international patterns) and street-address patterns; fails
  the suite and is also wired into the pre-commit hook (lint-staged) for `**/fixtures/regression/**`.
  Fake contact data uses reserved forms (`example.com`, `+48 000 000 000`) that the check allows.
- **Live mode** (`pnpm test:live`, opt-in, costs Claude usage): runs every case through the built
  native host (same path as the extension, not the provider directly), writes
  `recordings/<caseId>.json` with `reviewedAt: null`, and prints a review list. The user marks
  recordings reviewed (a small CLI flag), after which recorded mode uses them.
- **Metrics output**: a table per case (verified, unverified, skipped, seeded caught/total,
  injection leaks, durations) and totals: fabricated-verified count (must be 0), and p50/p95 of
  `requirements`, `tailoring` and `total` from recordings, with the model noted. Speed targets
  (profile ≤ 90 s, generation ≤ 60 s p95 on Sonnet 5.5, cached ≤ 45 s) are checked only on live
  recordings made with Sonnet 5.5.
- **Completeness gate**: the suite reports "incomplete" (not failing) until the manifest has
  ≥ 3 CVs and ≥ 20 ads with reviewed recordings; Stage 5 requires "complete".

### Security Design

- **Prompt injection**: unchanged defences from bolts 004/005; the validator adds a deterministic
  last line (injected facts can't be cited and fail `UNKNOWN_*`); the injection cases measure it.
- **Feedback channel**: validator feedback contains only rule names, line IDs and offending tokens,
  inserted into the escaped `<validator_feedback>` block; no profile text is echoed beyond tokens
  the model itself produced.
- **Fixture privacy**: anonymisation policy (ddd-01) plus the automated privacy check and the
  pre-commit hook; raw user files stay in git-ignored `exampleCV/` and are never read by the suite.
- **Logs**: counts, codes, durations only.

### NFR Implementation

- **0 fabricated facts pass as verified**: rules are conservative for facts (any unmatched number,
  percentage, date, skill → unverified); the seeded bank covers every rule; the suite fails on any
  escape.
- **Generation ≤ 60 s p95 (Sonnet 5.5), ≤ 45 s with cached requirements**: one requirements call
  (cached), one tailoring call, a retry only on violations; validator ≤ 50 ms. Measured in live mode
  at Stage 5. If over budget, the documented fallback (bolt 005) is a faster model for the
  requirements step.
- **Cancel ≤ 2 s**: signal propagated to the host runner (bolt 004).
- **1 MB host → extension limit**: unchanged; plans are capped by bolt 005's schema limits;
  `GenerationResult` stays in the extension (never crosses native messaging).
- **No stuck state**: watchdog + terminal-state invariant tested.

### Test Strategy

- **Validator (shared, Vitest, pure)**: one test file per rule family with positive and negative
  cases; translation cases (EN profile → PL/DE lines) that must verify; Polish inflection cases;
  property-style tests for normalisers (random formatting of the same number/date must normalise
  equal; random distinct values must not); user-edited lines skipped; feedback format and cap.
- **Pipeline (extension, Vitest)**: fake `RequirementsResolution`/`Tailoring` (bolt 005 pattern):
  happy path; violations → exactly one retry with feedback; better attempt chosen (incl. tie);
  `INVALID_OUTPUT` on attempt 1 → retry; attempt 2 error → attempt 1 kept; cancel at each state →
  `CANCELLED` and no further progress; disconnect → `HOST_DISCONNECTED`; unconfirmed profile →
  immediate typed error; tailoring-call counter ≤ 2; watchdog.
- **Regression (shared, Vitest, recorded mode)**: synthetic set in Stages 2–4, the user's set at
  Stage 5; privacy check on every fixture; no-network guard.
- **No test runs the real `claude`**; live mode is a separate opt-in script.

### Decisions for the user (bundle)

1. **Module layout**: validator under `shared/src/validation/` (one module per rule family,
   normalisers and lexicons internal); pipeline under `extension/src/features/generation/`.
2. **Bullets implicitly cite their parent item**, so a bullet may use its item's company, title and
   dates without listing the item ID.
3. **Company detection is conservative**: unknown capitalised tokens are flagged as
   `UNKNOWN_COMPANY` only when they look like an organisation (legal suffix or `at`/`w`/`bei`);
   numbers, percentages, dates and skills are flagged strictly. Recall is measured by the
   seeded-fabrication bank.
4. **Retry also covers bolt 005's postcondition failures** (`INVALID_OUTPUT`), still within the
   two-call limit; if attempt 2 fails after attempt 1 produced a plan, attempt 1 is returned with
   its unverified lines (except on cancel/disconnect).
5. **Regression fixtures live in `shared/test/fixtures/regression/`** with a manifest; recordings
   carry `reviewedAt` and are only used once reviewed; recorded profiles of the user's CVs are
   reviewed by the user before use.
6. **Live mode runs through the built native host** (the real extension path), opt-in via
   `pnpm test:live`.
7. **Privacy check also runs as a pre-commit hook** for regression fixtures.
8. **Generation runs over a long-lived side-panel port**; closing the panel cancels the run.

### Stage 3 (ADR) recommendation

Skip. The design follows bolt 005's approved architecture; the new decisions (positional line IDs,
conservative company detection, retry on postcondition failure) are recorded above with their
reasons. If ADRs are wanted, the candidate is **conservative company detection** (it trades recall
on unknown capitalised words for fewer false "unverified" flags).

### Open Questions

None blocking Stage 4.

### User Decisions (2026-10-28T11:52:24Z)

- Decision bundle 1–8 approved; Stage 3 (ADR) skipped.

### User Decisions (2026-10-28T19:08:38Z)

- Stage 4 approved. The real regression set lives in `shared/test/fixtures/regression/real/`, git-ignored (local only); only the synthetic set and summary metrics are committed.
