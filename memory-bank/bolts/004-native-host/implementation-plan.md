---
stage: plan
bolt: 004-native-host
created: 2026-10-25T19:39:45Z
---

## Implementation Plan: native-host (Claude Code provider + PDF text extraction)

### Objective

Run every AI step through the user's Claude Code safely (all tools off, isolated temp dir, capped
turns, selected model, timeout, cancel, typed errors) behind the shared `CvGenerationProvider`
port, and extract correctly ordered text from CV PDFs, including two-column layouts, with typed
failures for scanned, corrupted and password-protected files.

### Deliverables

**Story 005: Claude Code provider** (`native-host/src/providers/`)
- `claude-runner.ts`: one structured Claude call, using the spike's invocation:
  `claude -p --model <id> --output-format stream-json --verbose --json-schema <schema>
  --tools "" --strict-mcp-config --setting-sources "" --no-session-persistence
  --system-prompt-file <file> --max-turns 3`, with the user prompt on **stdin**, spawned without a
  shell (reuses `run-process.ts`), a 120 s timeout and `AbortSignal`
- **Runtime lockdown check** (spike risk mitigation): the `init` event must show
  `tools ⊆ ["StructuredOutput"]` and no MCP servers, and no other `tool_use` may appear;
  otherwise the result is rejected (`GENERATION_FAILED`, reason `LOCKDOWN_VIOLATION`)
- Fresh, empty working directory per run (`%LOCALAPPDATA%\cv-snap\run\<random>`), deleted in
  `finally`. The system prompt file lives there too
- **Error mapping** (spike evidence):
  - spawn `ENOENT` → `CLAUDE_NOT_FOUND`
  - timeout → `GENERATION_TIMEOUT`
  - abort → `CANCELLED`
  - `api_error_status: 404` / `[claude-code:unrecognized_model]` → `MODEL_UNAVAILABLE` (with the hint "choose another model in settings")
  - "Not logged in" → `CLAUDE_NOT_AUTHENTICATED`
  - other `is_error`, non-JSON output, missing `structured_output` or zod-invalid output → `GENERATION_FAILED` (reason `INVALID_OUTPUT`, so the pipeline can retry)
- `claude-code-provider.ts`: `ClaudeCodeProvider implements CvGenerationProvider`. `checkHealth`
  delegates to bolt 003's health check. `createProfile`, `parseRequirements` and `tailor` each
  report progress, build a prompt with an **injected prompt set**, run the runner with the matching
  AI-output JSON Schema, and validate with zod (profile with the unique-ID rule)
- `shared/src/prompts.ts`: the `Prompt` and `PromptBuilders` **types only**. The prompt text is
  story 001/003–005 work (bolt 005-cv-tailoring-core)
- Host wiring: `extractPdfText` is registered now. The three AI handlers are registered in bolt
  005, when real prompts exist; until then they keep answering "not supported by this host version"

**Story 006: PDF text extraction** (`native-host/src/pdf/`)
- `extract-text.ts`: base64 → bytes (≤ 10 MB, else `PDF_PARSE_FAILED` / `TOO_LARGE`) → `pdfjs-dist`
  (legacy Node build, no eval, no font loading) → text items with positions → layout → `{ text, pageCount }`
- `layout.ts` (pure, unit-tested):
  - **Lines:** group items into lines by baseline.
  - **Columns:** detect a vertical gutter (an empty x-band in the middle 15–85% of the page that
    few lines cross). Read each block top to bottom: full-width lines in place, then the left
    column, then the right column, so columns are never interleaved line by line.
  - **Normalization:** NFKC (ligatures ﬁ/ﬂ → fi/fl), soft hyphens removed, whitespace collapsed.
  - **Headers and footers:** lines repeated at the top or bottom of several pages are
    de-duplicated, with digits ignored, so "Strona 1 z 2" matches "Strona 2 z 2".
- **Failures:**
  - no extractable text → `PDF_PARSE_FAILED` / `NO_TEXT` (hint: scanned PDFs aren't supported)
  - password → `PASSWORD_PROTECTED`
  - broken file → `CORRUPTED`
  - anything else → `UNREADABLE`
- Dependency: `pdfjs-dist` 6.4.299 (native-host)

### Dependencies

- Bolt 003: protocol handlers, `run-process`, `find-claude`, health check, app-data paths
- Bolt 002: `CvGenerationProvider`, AI-output schemas (`toClaudeJsonSchema`), `ErrorCode`
- Spike 001: flags, error shapes, stdin transport, lockdown evidence
- `pdfjs-dist` (new runtime dependency of the host)

### Technical Approach

- **Unit tests never run the real `claude`**. The runner takes an injected process runner, and tests
  feed recorded stream-json transcripts: the spike's real shapes for success, invalid model, logged
  out, a lockdown violation, non-JSON output and missing `structured_output`. Timeout and cancel
  are tested with a slow fake process, checking the kill happens within 2 s
- **PDF fixtures are synthetic**: a small test helper writes minimal valid PDFs in memory
  (Helvetica text at chosen positions): single-column, two-column CV, two pages with a repeated
  header and footer, image-only, truncated (corrupted), and encrypted (an `/Encrypt` dictionary
  that the empty password doesn't open). Nothing from `exampleCV/` is committed
- **Local evaluation on `exampleCV/` (not committed)**: run extraction over all 44 sample PDFs and
  report only counts (pages, characters, columns detected, failures). I'll read the extracted text
  of a few two-column samples locally to judge ordering, and print no personal content
- **One real-CLI smoke run in Stage 3** (Haiku, synthetic text, about 3 calls): verify
  `--system-prompt-file`, the runtime lockdown check and `MODEL_UNAVAILABLE` against the installed
  Claude Code 2.1.302

### Acceptance Criteria

- [ ] The provider runs `claude -p` with all tools disabled, an empty temp working dir, capped turns
  and `--model <selected>` (asserted on the spawned arguments; lockdown also checked at runtime)
- [ ] A run over 120 s is killed → `GENERATION_TIMEOUT`
- [ ] Cancel kills the child within 2 s (process tree on Windows)
- [ ] Unavailable model → `MODEL_UNAVAILABLE` with a hint
- [ ] The temp directory is deleted after every run (success, failure, timeout, cancel)
- [ ] Non-JSON or invalid output → `GENERATION_FAILED` (retryable by the pipeline)
- [ ] Text-based PDF ≤ 10 MB → text + page count
- [ ] Two-column fixture → columns not interleaved
- [ ] Image-only → `PDF_PARSE_FAILED` / `NO_TEXT`; corrupted / password-protected → `PDF_PARSE_FAILED`
  with a specific reason
- [ ] Ligatures normalized; repeated headers and footers de-duplicated
