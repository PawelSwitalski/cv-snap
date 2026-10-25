---
stage: test
bolt: 004-native-host
created: 2026-10-25T20:06:21Z
---

## Test Report: native-host (Claude Code provider + PDF text extraction)

### Summary

- **Tests**: 230/230 passed (27 files; 54 new in this bolt), `pnpm test`
- **Coverage**: 96.6% lines, 89.3% branches overall; `pdf/layout.ts` 100% lines, `claude-runner.ts` 100% lines, `extract-text.ts` 94.6%, `claude-code-provider.ts` 92.9%
- **Real-CLI smoke run** (Claude Code 2.1.302, Haiku, 3 calls): passed
- **Local sample evaluation** (`exampleCV/`, 43 PDFs, not committed): 17/17 text PDFs extracted, 26/26 image-only rejected with `NO_TEXT`

### Test Files

- [x] `native-host/src/providers/claude-runner.test.ts` - exact lockdown arguments; recorded real transcript → output; lockdown violations (built-in tool, MCP server, foreign tool call); `MODEL_UNAVAILABLE` (404 and stderr tag); `CLAUDE_NOT_AUTHENTICATED`; `MAX_TURNS` / `CLAUDE_ERROR`; non-JSON and missing output → `INVALID_OUTPUT`; spawn/abort/timeout mapping; no model output in messages; empty cwd, stdin prompt, system-prompt file, 120 s default; run directory deleted on success, failure and throw; real hanging child killed on timeout and on cancel (< 2 s); Claude project stub removed only when empty
- [x] `native-host/src/providers/claude-code-provider.test.ts` - each step: progress, prompt on stdin, model, matching JSON Schema, zod-validated result; schema-breaking output and duplicate profile IDs → `INVALID_OUTPUT`; no leaks into messages; `CLAUDE_NOT_FOUND`; health delegation
- [x] `native-host/src/pdf/layout.test.ts` - normalization (ligatures, soft hyphens, icon glyphs); one column; two columns under a full-width title; side-by-side lists inside a one-column page; lists with differently indented headings; margin heading ends a run; date column above side-by-side lists (sample regression); date column kept row by row; gutter edge cases; header/footer de-duplication; page separation
- [x] `native-host/src/pdf/extract-text.test.ts` - synthetic PDFs: text + page count, two-column reading order, repeated header/footer, image-only → `NO_TEXT`, encrypted → `PASSWORD_PROTECTED`, not a PDF / empty → `CORRUPTED`, truncated → `PDF_PARSE_FAILED`, > 10 MB → `TOO_LARGE`, cancel → `CANCELLED`
- [x] `native-host/test/e2e.test.ts` (extended) - built host answers `extractPdfText` over real stdio with progress; scanned PDF → `NO_TEXT`
- [x] `native-host/test/pdf-fixtures.ts` - minimal PDF writer (text at positions, image-only pages, `/Encrypt` dictionary)
- [x] `native-host/test/fixtures/claude/success.jsonl` - real stream-json transcript from the smoke run, reduced to the fields the runner reads (no paths, session or personal data)

### Acceptance Criteria Validation

**Story 005-claude-code-provider**
- ✅ **`claude -p` with all tools disabled, empty temp working dir, capped turns and `--model <selected>`**: arguments asserted exactly; cwd empty at spawn time; lockdown also enforced at runtime from the session's `init` event (verified against the real CLI)
- ✅ **Run over 120 s killed → `GENERATION_TIMEOUT`**: default timeout 120 s asserted; real hanging child killed and mapped (shortened timeout in test)
- ✅ **Cancel kills the child within 2 s**: real child, measured < 2.2 s including test overhead; process tree force-killed if needed (`run-process`)
- ✅ **Unavailable model → `MODEL_UNAVAILABLE` with a hint**: recorded shapes and real CLI (1.9 s)
- ✅ **Temp directory deleted after the run**: after success, failure, runner exception, timeout and cancel; real smoke run left no run directories and no Claude project stubs
- ✅ Edge case: non-JSON text → `GENERATION_FAILED` (`INVALID_OUTPUT`, retryable)

**Story 006-pdf-text-extraction**
- ✅ **Text-based PDF ≤ 10 MB → text and page count**
- ✅ **Two-column fixture → columns not interleaved** (synthetic fixture; 6 two-column samples checked locally)
- ✅ **Scanned/image-only → `PDF_PARSE_FAILED` / `NO_TEXT`** (fixture; 26 image-only samples, each verified to contain zero text items)
- ✅ **Corrupted or password-protected → `PDF_PARSE_FAILED` with a specific reason** (`CORRUPTED`, `PASSWORD_PROTECTED`)
- ✅ Edge cases: ligatures normalized; repeated headers/footers de-duplicated

### Issues Found

- **Local column runs (sample-driven)**, fixed and covered by unit tests:
  - a rejected run was re-tested from its second row, merging only the first row; now a rejected run is read row by row as a whole
  - a longer bullet in the left list counted as "crossing" the narrowed gap and broke the run; now only an item spanning the whole gap crosses
  - a date column above could absorb side-by-side lists below; a row with its own, non-aligned gap now ends the run
  - (tried and reverted) allowing one crossing item in page-gutter detection made single short items look like columns
- Test-side: synthetic layouts had unrealistically narrow columns and too few items; made realistic.

### Notes

- Real-CLI smoke run results: structured output valid (`company: null`, not invented), prompt injection in the ad ignored, `--system-prompt-file` honoured, `MODEL_UNAVAILABLE` with hint, clean-up complete.
- Observation for bolt 005: the same mixed-language ad was parsed once as `language: "pl"` and once as `"en"`; prompts must state how to decide the language (spike finding confirmed).
- Sample text was read locally to judge ordering only; it was not printed, stored or committed.
