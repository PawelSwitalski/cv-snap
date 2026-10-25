---
unit: 002-native-host
intent: 001-one-click-tailored-cv
phase: inception
status: complete
unit_type: integration
default_bolt_type: simple-construction-bolt
created: '2026-10-25T12:00:00Z'
updated: '2026-10-25T12:00:00Z'
---

# Unit Brief: 002-native-host

## Purpose

A stateless Node.js process launched by Chrome via native messaging. It extracts text from PDFs and runs headless Claude Code for every AI step, returning JSON only.

## Scope

### In Scope
- Spike to confirm Claude Code headless capabilities
- Native messaging framing, validation, size limits, long-lived port, progress, cancel
- Install/uninstall scripts (Windows registry)
- Health check (host, CLI, login, version)
- ClaudeCodeProvider (tools disabled, temp dir, turns, timeout, `--model`)
- PDF text extraction (`pdfjs-dist`)

### Out of Scope
- Prompt content and schemas (001)
- Storing any data (host is stateless)
- UI (005)
- npm/Web Store release (future intent)

---

## Assigned Requirements

**These FRs from the intent are assigned to this unit. Stories are created from these.**

| FR | Requirement | Priority |
|---|---|---|
| FR-1 | Native host installation and health check | Must |
| FR-3 | CV PDF upload and text extraction | Must |
| FR-20 | Model selection | Must |

---

## Domain Concepts

### Key Entities
| Entity | Description | Attributes |
|---|---|---|
| NativeRequest / NativeResponse | Protocol frames | requestId, type, payload / ok, data | error |
| ClaudeRun | One `claude -p` child process | model, prompt, timeoutMs, maxTurns, tempDir, abort |
| HealthReport | Health check result | hostVersion, claudeFound, claudeVersion, isAuthenticated, isVersionSupported |

### Key Operations
| Operation | Description | Inputs | Outputs |
|---|---|---|---|
| handleMessage | Validate and dispatch a frame | framed JSON | NativeResponse / progress |
| runClaude | Spawn headless Claude Code | prompt, model, signal | JSON text |
| extractPdfText | PDF → text | PDF bytes | text, pageCount |
| checkHealth | Environment checks | - | HealthReport |

---

## Story Summary

- **Total Stories**: 6
- **Must Have**: 6
- **Should Have**: 0
- **Could Have**: 0

### Stories

- [ ] **001-claude-code-headless-spike**: Claude Code headless spike - Must - Planned
- [ ] **002-native-messaging-protocol**: Native messaging protocol - Must - Planned
- [ ] **003-host-install-scripts**: Host install scripts - Must - Planned
- [ ] **004-health-check**: Health check - Must - Planned
- [ ] **005-claude-code-provider**: Claude Code provider - Must - Planned
- [ ] **006-pdf-text-extraction**: PDF text extraction - Must - Planned

---

## Dependencies

### Depends On
| Unit | Reason |
|---|---|
| 001-cv-tailoring-core | Message contracts, provider interface, error codes |

### Depended By
| Unit | Reason |
|---|---|
| 001-cv-tailoring-core | Pipeline calls the provider |
| 005-tailored-cv-ui | Onboarding health check, upload |

### External Dependencies
| System | Purpose | Risk |
|---|---|---|
| Claude Code CLI | Model access | High |
| Windows registry | Host registration | Low |
| pdfjs-dist | PDF parsing | Low |

---

## Technical Context

### Suggested Technology
Node LTS, TypeScript, zod, `pdfjs-dist`, `child_process.spawn` (no shell). Logs to stderr + rotating file; never stdout.

### Integration Points
| Integration | Type | Protocol |
|---|---|---|
| Chrome | Native messaging | stdio, 4-byte length prefix + JSON |
| Claude Code | Child process | CLI args + stdout JSON |

### Data Storage
| Data | Type | Volume | Retention |
|---|---|---|---|
| Logs | Rotating file in app-data | Small | Rotated (e.g. 5 × 1 MB) |

---

## Constraints

- Never write non-protocol bytes to stdout
- Outbound messages < 1 MB
- Spawn without a shell; arguments as an array

---

## Success Criteria

### Functional
- [ ] Install → health check passes on a clean Windows machine with Node + Claude Code
- [ ] Every Claude call honours model, timeout, tool restriction and cancel

### Non-Functional
- [ ] 0 crashes on malformed/oversized messages (fuzz test)
- [ ] Cancel kills the child process ≤ 2 s

### Quality
- [ ] Code coverage ~80% (shared/native-host) or most important user flows covered (extension), per coding standards
- [ ] All acceptance criteria met
- [ ] Code reviewed and approved

---

## Bolt Suggestions

| Bolt | Type | Stories | Objective |
|---|---|---|---|
| 001-native-host | simple-construction-bolt | 001-claude-code-headless-spike | Time-boxed spike: verify headless Claude Code tool restriction, structured JSON output, model selection and error detection; record the tested (minimum) version. |
| 003-native-host | simple-construction-bolt | 002-native-messaging-protocol, 003-host-install-scripts, 004-health-check | A registered, robust native host the extension can connect to, with a full health check. |
| 004-native-host | simple-construction-bolt | 005-claude-code-provider, 006-pdf-text-extraction | Run Claude Code safely (tools off, timeout, cancel, model) and extract text from CV PDFs. |

---

## Notes

Start with the spike: its findings decide the exact flags (tool disabling, JSON output, schema enforcement) and the minimum Claude Code version recorded in the host.
