---
stage: test
bolt: 019-store-ready-extension
created: 2026-10-31T09:45:00Z
---

## Test Report: store-ready-extension (PDF in the store build)

### Summary

- **Tests**: 1,084 passed, 1 skipped locally on Windows (`pnpm test`); 3 new.
- **Lint, typecheck, Prettier**: clean.
- **Built manifests**: `pnpm build` and `pnpm build:release` both declare the policy.
- **CI**: after the fix commit is pushed.

### Test Files

- [x] `extension/src/build/manifest.test.ts` (1 new): the same policy in development, production
  and release builds; `script-src` is exactly `'self'` and `'wasm-unsafe-eval'`; `object-src
  'self'`.
- [x] `extension/src/features/generate/use-fitted-cv.test.ts` (2 new): a WebAssembly error is
  logged with its message; other errors by name only.

### Acceptance Criteria Validation

- ✅ **Production and store builds render the PDF** (manual check below, production build loaded
  unpacked; the store build has the same manifest apart from `key`, pinned by manifest.test)
- ✅ **Manifest policy pinned for every build mode** (manifest.test)
- ✅ **WebAssembly render failures logged with their message, others by name only**
  (use-fitted-cv.test)

### Issues Found

- Why tests missed it: the render tests run react-pdf in Node, where no CSP applies, and every
  earlier manual check ran under `pnpm dev`, whose manifest WXT rewrites. From now on, the release
  dev check (a production build plus the host from the tarball) is the guard. It caught this.

### Manual check (Chrome, the clean test profile): ✅ passed 2026-10-31 (user)

1. Reload cv-snap (⟳) after `pnpm build`.
2. Generate a CV → the preview shows, with no "The PDF couldn't be prepared".
3. Download PDF → the file opens and is tailored, in the right language.
4. No `CompileError` or `CV render failed` in the side panel console.
