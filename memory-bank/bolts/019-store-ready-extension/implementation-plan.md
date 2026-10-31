---
stage: plan
bolt: 019-store-ready-extension
created: 2026-10-31T09:05:00Z
---

## Implementation Plan: store-ready-extension (PDF in the store build)

### Objective

Download PDF works in production and store builds, as it does under `pnpm dev`.

### Cause

- react-pdf lays out pages with Yoga, a WebAssembly module.
- The manifest declared no `content_security_policy`, so Chrome applied its default for extension
  pages, `script-src 'self'`, which forbids compiling WebAssembly. The side panel logged
  `WebAssembly.instantiate() … violates … "script-src 'self'"`.
- Not seen before: in dev mode WXT writes its own policy (allowing WebAssembly and its dev server),
  every earlier manual check used `pnpm dev`, and the Node tests have no CSP.

### Deliverables

- `extension/src/build/manifest.ts`: `content_security_policy.extension_pages` =
  `script-src 'self' 'wasm-unsafe-eval'; object-src 'self';` in every build mode. Only WebAssembly
  from the package is added: no `unsafe-eval`, no remote origins. No permission, no install
  warning.
- `extension/src/build/manifest.test.ts`: the policy is the same in development, production and
  release builds, and `script-src` lists exactly `'self'` and `'wasm-unsafe-eval'`.
- `extension/src/features/generate/use-fitted-cv.ts`: `describeRenderError` logs the message of
  WebAssembly errors (the engine's failure, never CV text); other errors keep only their name.
  Replaces the temporary diagnostic line of the dev check.

### Acceptance Criteria

- [ ] Production and store builds render the PDF (manual check in Chrome)
- [ ] Manifest policy pinned for every build mode
- [ ] A WebAssembly render failure is logged with its message, other failures by name only
