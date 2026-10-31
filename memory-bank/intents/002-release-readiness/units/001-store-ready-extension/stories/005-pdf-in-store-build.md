---
id: 005-pdf-in-store-build
unit: 001-store-ready-extension
intent: 002-release-readiness
status: complete
priority: must
created: '2026-10-31T09:00:00Z'
assigned_bolt: 019-store-ready-extension
implemented: true
---

# Story: 005-pdf-in-store-build

## User Story

**As a** user of the store (or any non-dev) build
**I want** Download PDF to work as it does in development
**So that** I get the tailored CV as a PDF

## Acceptance Criteria

- [ ] **Given** a production or store build, **When** the CV preview is rendered to PDF, **Then**
  the PDF library's WebAssembly layout engine is allowed to run and the PDF is ready to download
- [ ] **Given** the manifest of any build, **When** it is checked, **Then** extension pages allow
  `'self'` and `'wasm-unsafe-eval'` only (no `eval`, no remote scripts)
- [ ] **Given** a render that fails inside WebAssembly, **When** it is logged, **Then** the log
  names the engine's failure (no CV text)

## Technical Notes

- Found in the Operations dev check of release 0.1.0 (2026-10-31, user): "The PDF couldn't be
  prepared"; console: `WebAssembly.instantiate()` violates `script-src 'self'`
- Chrome's default extension-page policy blocks WebAssembly; `pnpm dev` hid it, because WXT writes
  its own policy in dev mode; Node tests have no CSP

## Edge Cases

| Scenario | Expected Behavior |
|---|---|
| `pnpm dev` | WXT extends the policy with its dev server; WebAssembly still allowed |
| Other render errors | Only the error name is logged (the message may quote the CV) |
