---
stage: implement
bolt: 001-native-host
created: 2026-10-25T17:46:00Z
---

## Implementation Walkthrough: native-host (Claude Code headless spike)

### Summary

Built a throwaway Node probe harness that drives the real `claude -p` (2.1.302) the same way the future
provider will (no shell, args array, stdin prompt, timeout, kill), and used it to answer the seven
research questions from the plan. Findings and the recommended invocation are in `spike-report.md`.

### Structure Overview

One shared runner module plus three probe scripts, each probe writing redacted JSON captures to a
`results/` folder. Everything lives inside the bolt folder and is never imported by product code.

### Completed Work

- [x] `memory-bank/bolts/001-native-host/spike/run-claude.mjs` - shared runner: sandbox with random canary, spawn/timeout/kill, redaction, stream-json parsing, chosen lockdown flag set
- [x] `memory-bank/bolts/001-native-host/spike/probe-a-tools.mjs` - tool-lockdown matrix (control, `--tools ""`, strict MCP + no settings, restricted, deny-list) with side-effect and tool_use detection
- [x] `memory-bank/bolts/001-native-host/spike/probe-b-json.mjs` - structured output: `--json-schema` vs prompt-only, unsatisfiable schema, Haiku vs Sonnet
- [x] `memory-bank/bolts/001-native-host/spike/probe-c-g-misc.mjs` - model matrix + invalid model, simulated logged-out auth, hygiene/max-turns/system prompt, stdin vs argv transport, cancel/orphan check
- [x] `memory-bank/bolts/001-native-host/spike/results/*.json` - raw redacted captures per probe
- [x] `memory-bank/bolts/001-native-host/spike-report.md` - findings, recommended flags, error mapping, minimum version, timings, risks

### Key Decisions

- **Logged-out simulated with an empty `CLAUDE_CONFIG_DIR`**: proves detection without logging the user out.
- **Random canary per sandbox**: a fixed token produced a false "leak" when the tool-less model invented a lookalike value.
- **Proof of lockdown from the `init` event + absence of `tool_use` + filesystem side effects**: three independent signals instead of trusting the model's text.
- **Synthetic CV/job text only**: no personal data from `exampleCV/` sent to Claude in this bolt.

### Deviations from Plan

- `--bare` dropped early: it ignores OAuth/keychain, so it cannot use the user's subscription.
- `LOCKDOWN` moved into the runner after importing it from probe B re-ran probe B (4 extra Haiku calls).
- `ENOENT` (Claude not on PATH) not yet probed; it costs nothing, so it moves to the test stage.

### Dependencies Added

None (Node built-ins only).

### Developer Notes

- Spike runs leave empty `~/.claude/projects/<cwd-slug>/memory/` dirs; these were cleaned up after the runs.
- Total spend ≈ 30 short calls (mostly Haiku; per-call costs in `results/*.json` as reported by the CLI).
- `results/*.json` contain the synthetic prompts and model output only; emails/org ids/home path redacted.
