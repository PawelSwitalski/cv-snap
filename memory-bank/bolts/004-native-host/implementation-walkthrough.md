---
stage: implement
bolt: 004-native-host
created: 2026-10-25T19:54:08Z
---

## Implementation Walkthrough: native-host (Claude Code provider + PDF text extraction)

### Summary

The host can now run any AI step through headless Claude Code with the verified lockdown, and the
`ClaudeCodeProvider` implements the shared provider port with zod-validated outputs and typed
errors. PDF text extraction is live in the host (`extractPdfText` request): it reads text with
pdf.js, puts it in reading order (page columns and local side-by-side lists), and reports scanned,
password-protected and damaged files with specific reasons. A local check over 43 sample CVs
extracted all 17 text-based PDFs and correctly rejected the 26 image-only ones.

### Structure Overview

`providers/` holds the generic structured runner (arguments, isolated run directory, stream-json
interpretation, runtime lockdown check, error mapping) and the provider that adds prompts and
schemas per step. `pdf/` separates pdf.js access (`extract-text.ts`) from pure layout rules
(`layout.ts`). Prompt text is injected through `PromptBuilders` (types in `shared/`), so the AI
handlers are registered in bolt 005 when the real prompts exist.

### Completed Work

- [x] `native-host/src/providers/claude-runner.ts` - Claude arguments from the spike, per-run temp directory with system-prompt file, stdin prompt, 120 s timeout, abort, stream-json interpretation, runtime lockdown check, error mapping, clean-up of the temp directory and Claude's empty project stub
- [x] `native-host/src/providers/claude-code-provider.ts` - `ClaudeCodeProvider` (health, profile, requirements, plan): progress, prompt building, JSON Schema per step, zod validation
- [x] `native-host/src/pdf/extract-text.ts` - size check, pdf.js loading (no font loading), page text with positions, typed failures, cancellation between pages
- [x] `native-host/src/pdf/layout.ts` - baseline grouping, page gutter detection, local two-column runs, normalization (NFKC, soft hyphens, icon-font glyphs), repeated header/footer removal
- [x] `native-host/src/main.ts` - `extractPdfText` handler with progress
- [x] `shared/src/prompts.ts` - `Prompt` and `PromptBuilders` types
- [x] `native-host/package.json` - `pdfjs-dist`, `zod`

### Key Decisions

- **stream-json output instead of json**: the `init` event lists the session's tools and MCP servers, so every run checks the lockdown at runtime (spike risk mitigation), not only in tests.
- **System prompt in a file, user prompt on stdin**: nothing large goes on the Windows command line; the cwd stays empty because the prompt file lives beside it, not in it.
- **Error messages never contain model output**: schema and CLI errors use fixed messages with a `reason`, so CV text can't leak into replies or logs.
- **Local column runs only for real column pairs**: both sides wide (≥ 25 % of the run) and similarly filled; narrow date/label columns stay row by row so dates stay next to their roles.
- **Section breaks measured against font size**: side-by-side lists often use different baselines, so line spacing between neighbouring rows is unreliable.

### Deviations from Plan

- **Local two-column runs added** (not in the plan): the sample check showed side-by-side skill lists inside one-column CVs being merged line by line. Tuned on the samples: heading indentation (gap overlap ≥ 1 pt), margin headings end a run.
- **Icon-font glyphs stripped** (Private Use Area characters) after the sample check.
- **pdf.js 6 API**: there is no `isEvalSupported` option any more (no eval-based font code), and documents are released with `loadingTask.destroy()`.

### Dependencies Added

- [x] `pdfjs-dist` 6.4.299 (native-host) - PDF parsing
- [x] `zod` (native-host) - output validation in the provider (already used by `shared`)

### Developer Notes

- Sample evaluation (local only, `exampleCV/` is git-ignored): 43 PDFs → 17 extracted (11–57 ms each, 6 two-column), 26 image-only → `NO_TEXT` (verified: zero text items). Only counts were reported; sample text was read locally to judge ordering and not stored.
- Known limits: icons that fonts map to ordinary letters (e.g. "Ó", "[") can't be told apart from text; right-to-left CVs are ordered by x like other text.
- `--system-prompt-file` is not listed in `--help` (only referenced); it is verified with the real CLI in Stage 3.
