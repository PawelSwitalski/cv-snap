---
stage: test
bolt: 013-store-ready-extension
created: 2026-10-29T16:19:37Z
---

## Test Report: store-ready-extension

### Summary

- **Tests**: 936/936 passed across the repo (`pnpm test`). 10 are new in this bolt's test stage
  (`manifest.test.ts`), and the identity and installer tests from Stage 2 were rewritten.
- **Typecheck, lint, Prettier**: clean.
- **Release build smoke check**: `pnpm --filter @cv-snap/extension zip:release` produced
  `cv-snap-0.1.0-chrome-release.zip`, 1.80 MB (4.44 MB unpacked). Its `manifest.json` has no
  `key`, has all four icons, and `action.default_icon` equals `icons`. The dev build
  (`.output/chrome-mv3`) still has the key.
- **Manual Chrome check**: ✅ passed (user, 2026-10-29T16:40:00Z)

### Test Files

- [x] `extension/src/build/manifest.test.ts`:
  - dev key in development and production;
  - the release manifest equals the dev manifest minus `key`;
  - icons and toolbar icon in 16/32/48/128;
  - no host permissions up front;
  - each PNG has the right signature and size;
  - the 128 px icon has 16 px of transparent padding around opaque artwork (alpha read from the
    PNG);
  - the 16 px icon is edge to edge.
- [x] `shared/src/extension-identity.test.ts`:
  - dev ID derived from the key;
  - allowed origins are the dev ID only while the store ID is empty, and exactly dev + store once
    it is set;
  - a configured store ID must be a valid ID that differs from dev.
- [x] `native-host/src/install/install.test.ts`: the manifest allows exactly the given origins; by
  default, the origins from `shared`.

### Acceptance Criteria Validation

**Story 001-release-build-without-key**
- ✅ **Dev build keeps the key; release build (zipped) has none** (manifest.test, smoke check)
- ✅ **Manifests differ only in `key`** (manifest.test)
- ✅ **Zip ≤ 10 MB** (smoke check: 1.80 MB)

**Story 002-store-extension-id**
- ✅ **`shared` defines the dev ID, the store ID and the allowed origins** (extension-identity.test)
- ✅ **No placeholder can ship**: the store ID is empty, not a fake value; the release guard is in
  `release:pack` (bolt 015, approved change)
- ✅ **`allowed_origins` contains exactly the trusted origins** (install.test)

**Story 003-extension-icons**
- ✅ **`icons` and `action.default_icon` list 16/32/48/128 px PNGs** (manifest.test, smoke check)
- ✅ **128 px: 96×96 artwork with 16 px transparent padding** (manifest.test, pixel alpha)
- ✅ **Recognisable at 16 px on light and dark toolbars; badge readable over it** (manual check)

### Issues Found

- None. During implementation, an SVG comment containing `--` was rejected by the renderer (XML
  rule) and was reworded.

### Manual Chrome check (✅ passed, user)

1. `pnpm build`, then reload the unpacked extension (`extension/.output/chrome-mv3`): the new icon
   shows on `chrome://extensions` and in the toolbar. Your installed host still connects (setup
   check passes), because the dev ID is unchanged.
2. Toolbar in a light theme and in a dark theme: the icon is recognisable at its small size.
3. Open a job ad on an allowed site: the "CV" badge is readable over the icon.
4. Optional: `pnpm --filter @cv-snap/extension zip:release`, then drag the zip into
   `chrome://extensions` (Developer mode) or load `.output/chrome-mv3-release` unpacked. It gets a
   **different** ID and can't reach the host. That is expected until the store ID is set.
