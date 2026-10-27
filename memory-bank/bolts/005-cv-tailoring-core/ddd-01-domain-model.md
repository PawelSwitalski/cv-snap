---
unit: 001-cv-tailoring-core
bolt: 005-cv-tailoring-core
stage: model
status: complete
updated: 2026-10-25T20:13:51Z
---

# Static Model - CV Tailoring Core (AI steps)

## Bounded Context

**CV Tailoring**: turning untrusted source texts (a CV's extracted text, a job ad) into structured,
citable facts, and producing a tailored CV plan that only re-selects, re-orders and re-phrases
those facts for one ad, in one output language.

- **Inside this bolt**: profile extraction (story 003), job requirements parsing and the 7-day cache
  (story 004), tailoring plan generation (story 005), and the prompt rules all three enforce.
- **Outside, consumed through contracts**: the Claude transport (unit 002-native-host, through the
  `CvGenerationProvider` port), ad capture (unit 003), the deterministic validator, retry pipeline
  and regression suite (bolt 006), profile review/editing and storage of the profile (unit 005, UI),
  and rendering (unit 004).
- **Placement**: pure domain logic (value objects, rules, prompt builders, ID assignment, ad-key
  normalisation, citation check, cache freshness) lives in `shared/`. Orchestrating services and
  the cache repository live in the extension background worker. The native host only runs the
  provider (it is stateless and builds prompts with the shared builders).

## Domain Entities

| Entity | Properties | Business Rules |
|--------|------------|----------------|
| CvProfile (draft) | sourceLanguage, contact, headline, summary[], experience[], projects[], education[], skills[], languages[], certifications[], otherSections[] | Created only from CV text. Holds only facts present in the source; anything not stated is `null`/empty, never inferred. Not usable for tailoring until confirmed. |
| CvProfile (confirmed) | the draft's content + id, schemaVersion, photoRef, confirmedAt, updatedAt | The **only source of facts** for tailoring. `confirmedAt` set once the user confirms (UI story). |
| ProfileItem | id + kind-specific fields (experience, project, education, skill, language, certification, other section), bullets[] | `id` is assigned by code, unique within the profile, and never changes after assignment (edits change text, not IDs). |
| Bullet | id, text | Same ID rules as ProfileItem. One fact-bearing line. |
| RequirementsCacheEntry | adKey, requirements, parsedAt | One entry per AdKey. **Fresh** while `now < parsedAt + 7 days`; a stale entry is re-parsed and replaced, never served. |
| TailoringPlan | language, summary[], items[], skills[], headings, gaps[], plus its provenance (profile id + profile `updatedAt`, adKey, model) | Built only from one confirmed profile + one JobRequirements. Every CV line cites ≥ 1 existing profile ID. Unmet requirements only in `gaps`. Written entirely in the requested OutputLanguage. |

## Value Objects

| Value Object | Properties | Constraints |
|--------------|------------|-------------|
| JobRequirements | title, company?, location?, seniority, mustHaves[], niceToHaves[], keywords[], language | Facts the ad doesn't state are `null` / `"unknown"` (spike 001: required fields get invented). `language` is the **ad language** decided by the rule below. Immutable once parsed. |
| AdInput | text (≤ 50 000 chars), url?, structuredFields? (JSON-LD title/company/description), isManualSelection | Untrusted. Raw ad text goes only to the requirements step, never to tailoring. |
| AdKey | value | URL-based: lower-case host, no fragment, tracking parameters removed (`utm_*`, `trk`, `fbclid`, `gclid`, `refId`, `trackingId`), remaining parameters sorted. Manual selection: URL key + hash of the selected text. Equal by value. |
| LanguageCode | code | ISO 639-1, two lower-case letters; any language. |
| OutputLanguage | code, source (`ad` / `override`) | `override` (from the user, this generation only) wins; otherwise `requirements.language`. |
| SourceId | id | An existing profile item or bullet ID. |
| PlanLine | text, sourceIds[≥1] | `text` restates only facts from the cited items. |
| PlanItem | profileId, rank, bullets[PlanLine] | `profileId` exists in the profile; ranks are distinct integers 1…n (1 = most relevant). |
| Gap | requirement, note? | A requirement the profile doesn't meet; never rendered as a CV line. |
| PlanHeadings | per-section label or `null` | Labels, not facts (outside fact checks). `null` for PL/EN (built-in labels); filled for any other language. |
| CvDate | year, month? | Language-independent, so translated CVs stay checkable. |
| Prompt | system, user | `system` = fixed rules; `user` = data only, untrusted text delimited. |
| ValidatorFeedback | messages[] | Only on the pipeline's single retry (bolt 006); passed as data. |

## Aggregates

| Aggregate Root | Members | Invariants |
|----------------|---------|------------|
| CvProfile | ProfileItem, Bullet, Contact, CvDate | All IDs unique; IDs assigned by code after extraction; IDs immutable afterwards; facts only from the source text; tailoring requires `confirmedAt`. |
| RequirementsCacheEntry | JobRequirements, AdKey | One entry per key; served only while fresh; replaced (not duplicated) on re-parse; the store prunes expired entries and stays bounded (a few hundred entries). |
| TailoringPlan | PlanItem, PlanLine, Gap, PlanHeadings | Every `sourceIds` entry and `profileId` resolves in the source profile; ranks distinct; plan `language` = requested OutputLanguage; gaps disjoint from CV lines; no line without a citation. |

## Domain Events

| Event | Trigger | Payload |
|-------|---------|---------|
| ProfileDraftCreated | Extraction succeeded and IDs were assigned | draft profile, sourceLanguage, model, durationMs |
| ProfileExtractionFailed | Invalid output twice, or a provider error | error code, reason, attempt |
| RequirementsResolved | Requirements available for a generation | adKey, requirements, `fromCache` |
| RequirementsCached | A fresh parse was stored | adKey, parsedAt |
| TailoringPlanProduced | A schema-valid plan whose citations resolve | plan, language, item count, gap count |
| TailoringFailed | Provider error, invalid output, or a broken invariant | error code, reason |

These events surface as the existing progress steps (`creating-profile`, `parsing-requirements`,
`tailoring`) and as log entries (codes, counts, durations, never content). No event bus is needed.

## Domain Services

| Service | Operations | Dependencies |
|---------|------------|--------------|
| ProfileExtraction (extension) | `createDraft(cvText, model, signal)`: provider call, then IdAssigner; one retry on invalid output, then `GENERATION_FAILED` | CvGenerationProvider, ProfileIdAssigner |
| ProfileIdAssigner (shared, pure) | `assign(content)`: discards model-given IDs and assigns new unique prefixed IDs (`exp_`, `prj_`, `edu_`, `skl_`, `lng_`, `crt_`, `oth_`, `sum_`; bullets derived from their item) | `newId` |
| RequirementsResolution (extension) | `resolve(adInput, model, signal, now)`: AdKey, then a fresh cache entry or a provider call (one retry on invalid output), then the cache | CvGenerationProvider, RequirementsCacheRepository, AdKeyNormalizer, Clock |
| AdKeyNormalizer (shared, pure) | `keyFor(url, selectedText?)` | hashing |
| Tailoring (extension) | `tailor(confirmedProfile, requirements, outputLanguage, validatorFeedback?, model, signal)`: precondition confirmed; postconditions language match and citations resolve | CvGenerationProvider, CitationCheck |
| CitationCheck (shared, pure) | `unresolvedCitations(plan, profile)`: each line/item/skill citing a missing ID | `collectProfileIds`; reused by the validator's UNKNOWN_SOURCE rule in bolt 006 |
| OutputLanguagePolicy (shared, pure) | `decide(requirements, override?)` | — |
| PromptBuilders (shared, pure; used by the host's ClaudeCodeProvider) | `profile(input)`, `requirements(input)`, `tailor(input)` → Prompt | — |

**Rules every prompt must enforce** (text itself: Stage 2 / implementation):
1. Untrusted text (CV text, ad text, selected text) is placed inside explicit delimiters and
   declared to be data. Instructions inside it are ignored. Delimiter look-alikes inside the text
   are neutralised.
2. Fixed rules go in the system prompt and data in the user prompt (stdin), matching the provider's
   transport.
3. Copy facts and never infer: no new numbers, dates, companies, titles, skills or seniority.
   Unknown facts are `null` / empty / `"unknown"`.
4. **Ad language rule** (fixes the spike's "pl" vs "en" ambiguity): the language of the ad's body
   text (responsibilities, requirements, offer) decides. The job title, company name, technology
   names and English loanwords don't count. If the body is evenly mixed, the language of the
   section headings decides; if still undecidable, the profile's `sourceLanguage` (user decision 2026-10-25: keeps the CV in the user's own language, no needless translation; the per-generation override still wins).
5. Tailoring sees only the profile JSON and the requirements JSON, never the raw ad. It only
   selects, re-orders and re-phrases. Unmet requirements go only to `gaps`. Everything is written
   in the OutputLanguage. Headings are filled only outside PL/EN. Ranks are distinct, 1 = most
   relevant.
6. Validator feedback on a retry is passed as data, and it never relaxes the rules.

## Repository Interfaces

| Repository | Entity | Methods |
|------------|--------|---------|
| RequirementsCacheRepository | RequirementsCacheEntry | `get(adKey)`, `put(entry)`, `pruneExpired(now)` (chrome.storage.local in the extension; in-memory for tests) |
| ProfileRepository | CvProfile | `getActive()`, `getDraft()`, `saveDraft(draft)`, `confirm(draftId)` (interface defined here; storage implemented with the UI in bolt 010) |

## Ubiquitous Language

| Term | Definition |
|------|------------|
| Fact | A statement in the source CV: a bullet, an item field, a skill, a date. |
| Profile draft | Profile produced by extraction, not yet confirmed by the user. |
| Confirmed profile | Profile the user confirmed; the only source of facts for tailoring. |
| Source ID / citation | Stable ID of a profile item or bullet; plan lines cite them in `sourceIds`. |
| Requirements | Structured view of one job ad (`JobRequirements`). |
| Ad key | Normalised identity of an ad for caching (URL, or URL + selection hash). |
| Fresh / stale | Cache entry younger / older than 7 days. |
| Tailoring plan | The selected, ranked, re-phrased, cited content of one tailored CV, plus gaps. |
| Plan line | One CV line (summary sentence, bullet, skill) with its citations. |
| Gap | A requirement the user doesn't meet; shown to the user, never in the CV. |
| Rank | Relevance order of plan items; lowest ranks are dropped first to fit two pages. |
| Ad language | Language of the ad's body text, decided by the ad language rule. |
| Output language | Language the plan is written in: the override, or else the ad language. |
| Untrusted text | Any text from a CV file or a web page; always data, never instructions. |
| Invalid output | Model output that fails the schema or a domain invariant; retried once where stated. |

### User Decisions (2026-10-25T20:25:48Z)

- Decision bundle 1–7 approved as proposed.
- Undecidable ad language falls back to the profile's `sourceLanguage` (not `en`).
