---
stage: test
bolt: 006-cv-tailoring-core
created: 2026-10-29T07:49:03Z
---

## Test Report: cv-tailoring-core (validator, generation pipeline, regression suite)

### Summary

- **Unit Tests**: full workspace suite 795/795 passed (79 files), incl. validator rule tests, normaliser tests (base forms, language equivalents, placeholders) and pipeline smoke tests
- **Integration Tests**: regression suite in recorded mode on the user's **real** set (git-ignored, local only) — set "real" complete: 6 CVs (PL×4, DE, EN; 5 two-column), 28 ads (PL 10, EN 13, DE 5; theprotocol.it, justjoin.it, stepstone.de), 27 reviewed Haiku recordings — all pass
- **Security Tests**: injection cases 4/4 with **0 marker leaks** (Haiku and Sonnet); hidden-text and data-tag escaping covered by unit tests
- **Fabrication**: seeded fabrications caught **100%** in every real case (14/14 or 7/7 per case) and on the synthetic set → **0 fabricated facts pass as verified**
- **Performance Tests** (Claude Code 2.1.302, Sonnet 5.5, 33 cases, live): see below — all targets met

### Performance (Sonnet 5.5 — the model the targets are defined for)

- **Profile creation**: 9.2–15.0 s per CV (6 CVs) → p95 ≤ 15 s (target ≤ 90 s) ✅
- **Generation (requirements + tailoring + validation, retry included)**: median 25.3 s, **p95 40.7 s** (target ≤ 60 s) ✅
- **Generation with cached requirements (tailoring only)**: p95 34.9 s (target ≤ 45 s) ✅
- Requirements step: median 6.0 s, p95 8.2 s
- Retries: 14/33 cases; final unverified lines: 16 of 864 (1.9 %)
- Haiku trial for comparison (before validator fixes): case median 59 s, p95 83 s, 18/27 retries

### Acceptance Criteria Validation

- ✅ **006-deterministic-validator**: pure function, unit tests per rejection rule (unknown source, skill, number, date, percentage, company, title); language-independent comparison incl. Polish inflection; headings and user-edited lines excluded
- ✅ **006-deterministic-validator**: 0 fabricated facts pass as verified across the regression set (seeded fabrications 100% caught)
- ✅ **007-generation-pipeline-with-retry**: at most one retry with validator feedback; better attempt kept; cancel → CANCELLED, disconnect → HOST_DISCONNECTED, watchdog; unverified lines surfaced with line IDs
- ✅ **008-regression-fixture-suite**: ≥ 3 CVs (6) and ≥ 20 ads (28) with PL/EN/other mix, mismatches and injection cases; recorded mode in the normal run (network/spawn blocked); opt-in live mode; review gate; PII guard (committed sets + pre-commit hook)
- ✅ **Speed targets** (deferred from bolt 005): measured above with Sonnet 5.5 — met

### Issues Found (all fixed, with regression tests)

1. **Fabrication leak — inflected skills**: "w Kubernetesie", "z Dockerem" passed as verified for a profile without them. Skill mentions now resolve through Polish base forms (`baseFormCandidates`); known inflected skills ("w Angularze") still accepted.
2. **False positives — Polish locatives as companies**: "w Javie / Angularze / Scrumie / Pythonie" flagged UNKNOWN_COMPANY (56/57 first-attempt company flags) → base forms of known skills are not organisations. Retries on the same Haiku plans: 18/27 → 7/27.
3. **False positives — spoken languages in the skills list**: "English (B2)" for a profile language "angielski" → PL/EN/DE language equivalents; unlisted languages still flagged.
4. **Missing employer → placeholder "unknown"** (cv-06, required `company`): `company` optional, prompt forbids placeholders, `placeholderToNull` safety net (PL/EN/DE) for employer, location, role, degree, field, issuer; PDF, editor and validator handle null.
5. **Tooling**: `regression:review` silently reviewed nothing (argument parsing); live run crashed on a missing `recordings/` folder; added `--resume` (interrupted runs continue without re-paying finished cases) and profile timing in recordings.
6. Scrum, Kanban, Agile added to the built-in skill table.

### Recommendations

- **Live harness fidelity**: live mode turns the whole saved page into text; the extension uses the JSON-LD description / Readability. On ad-25 (English JSON-LD description, Polish site chrome) the harness got `pl` where the product would get `en`. Reuse the extension's extraction in live mode (follow-up, bolt 011 or a small fix).
- Manifest language labels for ad-24 and ad-31 should be `pl` (their JSON-LD descriptions are Polish); the product decided correctly.
- Remaining tuning candidates (false positives, not leaks): titles mentioned in summary lines that cite the summary instead of the job (UNKNOWN_TITLE), capitalised generic terms after "w"/"at" ("Code Review", "GitHub Actions"), rare consonant alternations ("w Reakcie").
- Remaining real catches the strict skill rule is meant to show as unverified: generalisations such as "API design", "design patterns", "deployment automation".
