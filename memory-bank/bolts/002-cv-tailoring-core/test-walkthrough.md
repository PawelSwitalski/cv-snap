---
stage: test
bolt: 002-cv-tailoring-core
created: 2026-10-25T18:41:50Z
---

## Test Report: cv-tailoring-core (monorepo scaffold + shared contracts)

### Summary

- **Tests**: 74/74 passed (11 files; `pnpm test`)
- **Coverage**: 99.05% lines overall; **100%** for every `shared/src` module; `native-host/src/lib/logger.ts` 100% lines / 85.7% branches; `native-host/src/main.ts` (placeholder) uncovered

### Test Files

- [x] `shared/src/cv-profile.test.ts` - valid fixture; schemaVersion, missing field, month range, ISO language, duplicate IDs (named in message), ID charset, IDs stable after text edit, content vs persisted schema, ID collection across all sections
- [x] `shared/src/ids.test.ts` - ID format, uniqueness over 5000 calls, collision retry, duplicate finder
- [x] `shared/src/job-requirements.test.ts` - nullable company, `unknown` seniority, any language, readable rejection, empty list entries
- [x] `shared/src/tailoring-plan.test.ts` - empty `sourceIds` rejected for bullets/summary/skills (path in message), rank rules, Claude-supplied headings
- [x] `shared/src/errors.test.ts` - full code list, payload with/without reason, cause kept, unknown errors hidden behind a generic message
- [x] `shared/src/protocol.test.ts` - every request type accepted, unknown type → `INVALID_MESSAGE`, missing/over-long `requestId`, non-object input, invalid model, progress/response frames, typed response data, reply map covers every request type, Chrome size limits
- [x] `shared/src/json-schema.test.ts` - all AI-output schemas convert, no `$schema`, all top-level fields required, `sourceIds` minItems 1, nullable facts, size < 16 KB for argv
- [x] `shared/src/provider.test.ts` - fake provider satisfies the port; progress callback; cancellation via `AbortSignal` → `CANCELLED`
- [x] `shared/src/parse.test.ts` - readable multi-line errors with paths
- [x] `native-host/src/lib/logger.test.ts` - JSON lines with fields, level filtering, writes to stderr with 0 bytes on stdout
- [x] `extension/src/entrypoints/sidepanel/App.test.tsx` - empty side panel renders
- [x] `shared/test/fixtures/*.valid.json` - synthetic profile (fictional person), requirements, plan

### Acceptance Criteria Validation

**Story 001-monorepo-scaffold**
- ✅ **`pnpm install && pnpm build` builds all three packages**: exit 0 (run from PowerShell after the pnpm reinstall)
- ✅ **`pnpm lint`, `pnpm format:check`, `pnpm test` pass**: all exit 0; `pnpm typecheck` also exit 0
- ✅ **`pnpm dev` starts WXT and the extension loads in Chrome with an empty side panel**: confirmed by the user
- ✅ **Pre-commit hook blocks a staged file with lint errors**: commit exit 1 with the three expected errors (TODO without reference, `any`, `console`); 0 commits created

**Story 002-domain-schemas-and-contracts**
- ✅ **Profile/requirements/plan schemas parse valid fixtures and reject invalid ones with readable errors** (messages name the path, e.g. `→ at items[0].bullets[0].sourceIds`)
- ✅ **Unique IDs that never change on edit**: duplicates rejected; `newId` collision-free; IDs are opaque and survive text edits unchanged (UI edit operations are built in story 004-profile-review-editor)
- ✅ **Requests are a discriminated union with `requestId`; replies are `NativeResponse<T>`**; unknown type → `INVALID_MESSAGE`
- ✅ **`ErrorCode` contains every code named in requirements** (incl. `MODEL_UNAVAILABLE`, `JOB_AD_NOT_DETECTED`) plus spike additions
- ✅ **`CvGenerationProvider` exposes `createProfile`, `parseRequirements`, `tailor`, `checkHealth` with progress callback and `AbortSignal`**

### Issues Found

- 3 wrong test expectations (zod's path format `a[0].b`; nullable fields emitted as `type: ["string","null"]`), fixed in the tests; code unchanged.
- Host logger used `console.error`, which Vitest intercepts; changed to `process.stderr.write` (simpler, testable).
- WXT 0.21 needs `web-ext` to launch Chrome; added as a dev dependency.
- WXT Vitest plugin resolved the wrong root when run from the workspace; root now explicit.
- Environment: the user's global pnpm install had an unlinked native binary (`pnpm.cmd` failed in cmd/PowerShell and in nested scripts); fixed by the user with `npm install -g pnpm@12.15.0 --foreground-scripts`.
- An orphaned WXT dev server (from a stopped background task) held port 3000/3001; stopped.

### Notes

- Coverage text reporter hides fully covered files; per-file numbers were checked with the `json-summary` reporter.
- No test runs the real `claude` CLI (coding standards).
