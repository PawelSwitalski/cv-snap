---
stage: implement
bolt: 001-native-host
story: 001-claude-code-headless-spike
created: 2026-10-25T17:46:00Z
claude_code_tested_version: 2.1.302
claude_code_minimum_version: 2.1.302
platform: Windows 11 (claude.exe via WinGet), Node 26.12.1
---

## Spike Report: Claude Code headless (`claude -p`) for the native host

### Summary

Headless Claude Code 2.1.302 meets every requirement of the native host, **but only with the exact
flag set below**. `--tools ""` alone is *not* a lockdown: claude.ai MCP connectors (e.g. Claude Docs)
are still injected. `--json-schema` gives validated JSON in `structured_output` and still works with
all tools disabled. Model and auth failures have distinct, machine-detectable shapes. Prompts must
go through **stdin** (argv overflows at Windows' command-line limit). Raw captures:
`spike/results/*.json` (redacted).

### Key Findings

1. **Tool lockdown** (probe A, prompt explicitly asks to read/write files, run shell, fetch web):
   - No flags (control): model used Read (leaked the canary), tried Write/Bash/WebFetch (denied by
     default permission mode in `-p`), 35 tools + 4 claude.ai MCP servers available.
   - `--tools ""`: 0 built-in tools but **8 `mcp__claude_ai_Claude_Docs__*` tools still available**.
     MCP connectors connect asynchronously, so their presence is racy (absent in run 1, present in run 2).
   - `--disallowedTools <list>`: unsafe deny-list; 24 tools remain (Skill, SendMessage, RemoteTrigger,
     ToolSearch, CronCreate, MCP…). Model invoked ToolSearch.
   - **`--tools "" --strict-mcp-config --setting-sources ""`**: init event shows `tools: []`,
     `mcp_servers: []`; zero `tool_use` events; no canary leak, no files created. ✅
   - `--restricted --tools "" --strict-mcp-config`: equivalent result; adds nothing over the above.
   - `--bare` is **unusable**: it never reads OAuth/keychain, so the user's subscription login is ignored.
   - **With `--json-schema`** the init tool list is exactly `["StructuredOutput"]`: an internal tool the
     model calls once with the answer object (hence `num_turns: 2`). It has no file/shell/network
     capability. Verified under a prompt-injection job ad (test stage): only `StructuredOutput` used,
     no canary leak, no side effects.
   - With tools removed, the model may still *write fake tool-call markup and invented "function
     results"* as plain text (it even produced a canary-looking token by guessing; an early false
     positive in this spike). Harmless for security, but output must be schema-validated, never trusted.
2. **Structured JSON** (probe B):
   - `--output-format json --json-schema '<schema>'` → envelope field **`structured_output`** holds the
     parsed object (and `result` holds the same JSON as a string). Valid on Haiku and Sonnet.
     Costs one extra internal turn (`num_turns: 2`). Works with the lockdown flags.
   - Prompt-only JSON instructions also parsed and validated in this run, but give no guarantee
     (`structured_output` absent).
   - **An unsatisfiable schema is "satisfied" by fabrication**: required `salaryPln` (integer ≥ 1) for an
     ad with no salary → `{"salaryPln": 1}`, `is_error: false`. Schemas must make unknown facts
     expressible (`null` / `"unknown"`), or the model will invent them, which violates the core rule of not inventing experience.
   - Output language is not stable across models (Sonnet translated Polish requirements to English,
     Haiku kept Polish). Prompts must pin the output language explicitly.
3. **Model selection** (probe C): aliases `haiku|sonnet|opus` and full IDs
   `claude-haiku-5-5|claude-sonnet-5-5|claude-opus-5-5` all work on a **Pro** subscription;
   `modelUsage` keys confirm the resolved model. Invalid model →
   exit code **1**, `is_error: true`, `api_error_status: 404`, `terminal_reason: "api_error"`,
   stderr contains **`[claude-code:unrecognized_model]`**. Note `subtype` is `"success"` even on errors:
   never use `subtype` to detect failure.
4. **Auth** (simulated logged-out via empty `CLAUDE_CONFIG_DIR`; the real login was never touched):
   - **`claude auth status --json`**: no model call, ~130–220 ms; logged in → exit 0,
     `loggedIn: true`, `authMethod: "claude.ai"`, `subscriptionType`; logged out → **exit 1**,
     `loggedIn: false`, `authMethod: "none"`. Output includes email/org → host must not log it.
   - `claude -p` while logged out → exit 1, `is_error: true`, `terminal_reason: "api_error"`,
     `api_error_status: null`, result text `"Not logged in · Please run /login"`.
5. **Hygiene**: `--no-session-persistence` → no transcript files written, but Claude Code still creates
   an empty `~/.claude/projects/<cwd-slug>/memory/` directory per distinct cwd (even with
   `--setting-sources ""`). `--system-prompt` replaces the Claude Code system prompt: model reports
   no tools/skills and cost per call drops ~60%. `--max-turns` is accepted although hidden from
   `--help`; with `--json-schema`, `--max-turns 1` still succeeds (2 turns reported).
   `--effort low` works and cut cost further on Haiku.
6. **Timings** (wall clock, tiny prompt, incl. process start): Haiku ~2.5 s (TTFT ~1.2 s),
   Sonnet ~2.9–4.2 s, Opus ~2.7–3.4 s; schema extraction ~3–4 s; 80 KB prompt on Haiku ~3.1 s.
   `--version` 33 ms, `auth status` ~130–220 ms.
7. **Cancel**: `child.kill()` on Windows terminated `claude.exe` (+ its `conhost.exe`) in 13 ms;
   no orphan processes. Keep `taskkill /T /F` as a fallback if `close` doesn't fire within 2 s.
8. **Input transport**: 80 KB prompt via **stdin** → correct answer. Same prompt via argv →
   `spawn` **throws synchronously** `ENAMETOOLONG` (not an `error` event). Always use stdin; wrap
   `spawn` in try/catch.

### Recommendation

**Recommended invocation** (args array, `spawn` without shell, prompt on stdin):

`claude -p --model <alias|id> --output-format json --json-schema <schema-json>
--tools "" --strict-mcp-config --setting-sources "" --no-session-persistence
--system-prompt <cv-snap system prompt> [--max-turns 3] [--effort low]`

- cwd: one fixed host-owned empty directory (e.g. `%LOCALAPPDATA%\cv-snap\run`), not a fresh temp dir per
  call, to avoid accumulating `~/.claude/projects/*` stubs.
- Read the result from `structured_output`; validate it again with zod (defense in depth).
- Env: pass through the user's env (auth lives in their config dir); never set `ANTHROPIC_API_KEY`.

**Error detection → `ErrorCode`** (evaluate in this order):

1. `spawn` error `ENOENT` → `CLAUDE_NOT_FOUND` (verified: `spawn claude ENOENT` when not on PATH)
2. Version < 2.1.302 (from `claude --version`) → `CLAUDE_VERSION_UNSUPPORTED` *(new code, add in bolt 002)*
3. `auth status --json` → `loggedIn: false` / exit 1, **or** `-p` result starts with
   `"Not logged in"` → `CLAUDE_NOT_AUTHENTICATED`
4. `api_error_status: 404` or stderr `[claude-code:unrecognized_model]` → `MODEL_UNAVAILABLE`
   *(story names it; missing from coding-standards list; add in bolt 002)*
5. Host timeout fired → `GENERATION_TIMEOUT`
6. `is_error: true` (any other), non-JSON stdout, missing/invalid `structured_output` →
   `GENERATION_FAILED` (retry policy belongs to story 007)

**Rationale**: an allow-list of zero tools + strict MCP + no setting sources is the only combination
that produced an empty tool *and* MCP list; `--json-schema` is the only method with a validation
guarantee; detection relies on fields that differed deterministically between success and failure.

### Implementation Estimate

- **ClaudeCodeProvider (spawn, flags, stdin, timeout, cancel, error mapping)**: Effort: 0.5–1 day -
  Confidence: H
- **Health check (`--version` + `auth status --json`, no model call)**: Effort: 2–3 h - Confidence: H
- **Shared contracts additions (error codes, envelope schema)**: Effort: 1–2 h - Confidence: H

### Risks to Monitor

- **Flag drift across Claude Code versions** (hidden `--max-turns`, `structured_output` field,
  error strings): Likelihood M - Impact H - Mitigation: enforce minimum version; health check runs a
  free probe; contract test fixture of the JSON envelope.
- **New injected tool sources** (new connector types, plugins) bypassing `--strict-mcp-config`:
  Likelihood L–M - Impact H - Mitigation: run with `stream-json` and assert at runtime that
  `init.tools ⊆ ["StructuredOutput"]` and `init.mcp_servers` is empty; abort the run otherwise.
- **Fabrication to satisfy schemas**: Likelihood H - Impact H - Mitigation: nullable/unknown fields,
  deterministic validator (story 006), fixture regression suite (story 008).
- **Subscription limits / rate limits** (not observable in this spike; `rate_limit_event` appears in
  stream-json): Likelihood M - Impact M - Mitigation: map to a user-facing error in bolt 004.
- **Logged-in identity in `auth status` output**: Likelihood H - Impact M (privacy) - Mitigation:
  parse only `loggedIn`, `authMethod`, `subscriptionType`; never log raw output.
- **Spike tested on Windows only**: macOS/Linux behavior unverified (out of v1 scope).

### Suggested Next Steps

1. Bolt 002: add `MODEL_UNAVAILABLE`, `CLAUDE_VERSION_UNSUPPORTED` to `ErrorCode`; define a zod schema
   for the CLI JSON envelope (`is_error`, `api_error_status`, `terminal_reason`, `result`,
   `structured_output`); set `MIN_CLAUDE_CODE_VERSION = "2.1.302"`.
2. Bolt 002 schemas: every extracted fact field nullable/"unknown"; explicit `outputLanguage`.
3. Bolt 003 health check: `claude --version` + `claude auth status --json` (no tokens spent).
4. Bolt 004 provider: recommended invocation above; stdin; fixed cwd; `child.kill()` + taskkill fallback.
5. Update coding-standards error-code list (MODEL_UNAVAILABLE, CLAUDE_VERSION_UNSUPPORTED).

### Artifacts to Archive

- [x] Prototype code (throwaway, not reusable as-is): `memory-bank/bolts/001-native-host/spike/*.mjs`
- [x] Research notes / raw captures (redacted: no email, org id or home path):
  `memory-bank/bolts/001-native-host/spike/results/*.json`
