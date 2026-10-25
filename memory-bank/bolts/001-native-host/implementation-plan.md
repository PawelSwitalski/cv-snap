---
stage: plan
bolt: 001-native-host
created: 2026-10-25T17:25:48Z
time_box: 4h
---

## Implementation Plan: native-host (Claude Code headless spike)

### Objective

Verify, against the installed Claude Code, the exact headless behaviour the native host will rely on:
tool lockdown, schema-valid JSON output, model selection, and auth/model error detection. Record the
tested version as the minimum supported version. Output is **knowledge, not production code**.

### Environment (observed at plan time)

- Claude Code **2.1.302** (`claude.exe`, WinGet install)
- Node **v26.12.1**; pnpm **not installed** (not needed for this bolt; required from bolt 002)
- Windows 11, Git Bash + PowerShell

### Research Questions

1 - **Tool lockdown**: Which flag combo guarantees zero tool use (Read/Write/Edit, Bash/PowerShell,
WebFetch/WebSearch, MCP, sub-agents) even when the prompt explicitly asks for it? Candidates:
`--tools ""`, `--disallowedTools ...`, `--permission-mode`, `--strict-mcp-config`, `--bare`,
`--setting-sources ""`. How do we *prove* no tool ran (stream-json events / `num_turns` / side-effect canary file)?
2 - **Structured JSON**: `--json-schema` vs `--output-format json` + prompt instructions. Where does the
result land in the envelope (`result` vs `structured_output`)? Does it validate? What happens on a
schema the model can't satisfy?
3 - **Model selection**: `--model` with aliases (`haiku`, `sonnet`, `opus`) and full IDs
(`claude-haiku-5-5`, `claude-sonnet-5-5`, `claude-opus-5-5`), plus an invalid ID → exit code, stderr,
envelope fields (`is_error`, `subtype`) → mapping to `MODEL_UNAVAILABLE`.
4 - **Auth detection**: run with an isolated, empty config dir (`CLAUDE_CONFIG_DIR` → temp dir) to
simulate logged-out **without touching the user's real login**; also check whether there is a cheap
no-model-call auth probe (e.g. `claude auth status`). → mapping to `CLAUDE_NOT_AUTHENTICATED`.
5 - **Isolation & hygiene**: Does a run in an empty temp cwd pick up the user's CLAUDE.md / hooks /
MCP / plugins? Does `--no-session-persistence` stop transcript writes? Is `--max-turns` still
available in 2.1.302 (not in `--help` grep)?
6 - **Timings**: cold-start latency and per-model wall time for a small JSON task; cancel behaviour
(kill child on Windows → does it leave orphans?).
7 - **Input transport**: prompt via stdin vs argv (Windows command-line length limit ~32 KB matters for
CV + job ad text).

### Deliverables

- `memory-bank/bolts/001-native-host/spike/` – throwaway Node `.mjs` probe scripts (no deps, `spawn`
without shell, args as array – mirrors the future provider)
- `memory-bank/bolts/001-native-host/spike/results/` – raw JSON captures per probe (no personal data)
- `memory-bank/bolts/001-native-host/spike-report.md` – flags, tested/minimum version, timings,
error-shape → ErrorCode mapping, risks, recommendation for bolts 002/003/004
- `implementation-walkthrough.md`, `test-walkthrough.md` per bolt type

### Dependencies

- Claude Code CLI 2.1.302 + the user's logged-in subscription: the probes make real model calls
(estimated ~20–30 short calls, mostly Haiku; a few Sonnet/Opus for the model matrix)
- Node 26 (built-ins only)
- No dependency on other units or bolts

### Technical Approach

- One small runner (`run-claude.mjs`) that spawns `claude` with an args array, temp cwd, stdin prompt,
timeout + kill, and captures `{exitCode, stdout, stderr, durationMs}` to `results/*.json`.
- Probe scripts per research question, each writing its own results file; a canary file in the temp cwd
detects any file-tool side effects; `stream-json` events detect any `tool_use` blocks.
- Prompts use **synthetic** CV/job text only. `exampleCV/` PDFs are not sent to Claude in this bolt
(no PDF extraction yet; that is story 006). They are reserved for later fixture work.
- Spike code stays inside the bolt folder and is never imported by product code (story constraint).
- Deviation from the generic bolt type: "tests" for a spike = repeatable probe runs + an assertion
script that re-checks the captured results against acceptance criteria. No Vitest (repo is scaffolded
in bolt 002), and the coding-standard rule "tests never run the real `claude` CLI" is intentionally
waived for this spike only, since verifying the real CLI is the point.

### Acceptance Criteria

- [ ] With the chosen lockdown flags, prompts that request file read/write, shell, and web access
produce **zero** `tool_use` events and no canary side effects
- [ ] The most reliable schema-valid JSON method is documented with the envelope field to read
- [ ] `--model` outputs/error shapes recorded for Haiku 5.5, Sonnet 5.5, Opus 5.5 and an invalid model;
detection rule for `MODEL_UNAVAILABLE` defined
- [ ] Detection rule for `CLAUDE_NOT_AUTHENTICATED` defined from a simulated logged-out run
- [ ] `spike-report.md` records flags, tested version (= minimum 2.1.302), timings and risks
- [ ] Time-box (4h) respected; the user's real Claude login/config untouched
