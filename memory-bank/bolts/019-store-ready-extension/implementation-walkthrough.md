---
stage: implement
bolt: 019-store-ready-extension
created: 2026-10-31T09:30:00Z
---

## Implementation Walkthrough: store-ready-extension (PDF in the store build)

### Summary

The manifest now allows extension pages to compile WebAssembly from the package itself, which the
PDF library's layout engine needs. Render failures inside WebAssembly are logged with their
message.

### Completed Work

- [x] `extension/src/build/manifest.ts`: `EXTENSION_PAGES_CSP`
  (`script-src 'self' 'wasm-unsafe-eval'; object-src 'self';`) as
  `content_security_policy.extension_pages`, the same in every build mode.
- [x] `extension/src/build/manifest.test.ts`: the policy in development, production and release
  builds; `script-src` is exactly `'self'` and `'wasm-unsafe-eval'`.
- [x] `extension/src/features/generate/use-fitted-cv.ts`: `describeRenderError`, used by the
  render-failure log.
- [x] `extension/src/features/generate/use-fitted-cv.test.ts` (new).

### Key Decisions

- **The same policy in every build**, including dev: WXT extends it with its dev server under
  `pnpm dev`, so dev and store builds no longer differ in what they allow.
- **Only WebAssembly messages are logged.** They name the engine's failure, such as a blocked
  module or "memory access out of bounds". Other errors may quote CV text, so only their name is
  kept, as before.

### Deviations from Plan

None.

### Dependencies Added

None.

### Developer Notes

- Built manifests checked: `pnpm build` and `pnpm build:release` both contain the policy.
- The store listing needs no change: a content security policy is not a permission.
