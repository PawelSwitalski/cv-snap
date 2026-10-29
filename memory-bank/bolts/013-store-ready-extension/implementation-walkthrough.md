---
stage: implement
bolt: 013-store-ready-extension
created: 2026-10-29T16:25:00Z
---

## Implementation Walkthrough: store-ready-extension

### Summary

The extension now has a release build for the Chrome Web Store, without the dev key, zipped as
`cv-snap-<version>-chrome-release.zip`. Dev and production builds keep the dev ID. The store ID
has a single home in `shared`, and the host manifest trusts the dev build plus the store build once
that ID is set. cv-snap has its own icon in all four sizes.

### Structure Overview

The manifest is produced by one pure function per build mode, which `wxt.config.ts` calls with
WXT's mode. The release mode differs from the others only by leaving out `key`. Extension identity
(dev key and ID, store ID, allowed origins) lives in `shared` and is used by the host installer.
The icon is one SVG source, rendered once by a script into committed PNGs.

### Completed Work

- [x] `extension/src/build/manifest.ts` - the manifest per build mode: dev key for development and production, none for `release`; icons and toolbar icon in four sizes
- [x] `extension/wxt.config.ts` - manifest from the mode; zip artifact name `cv-snap-{version}-{browser}{modeSuffix}.zip`
- [x] `extension/package.json` - `build:release`, `zip:release`, `icons` scripts; `@resvg/resvg-js` dev dependency
- [x] `extension/assets/icon.svg` - the cv-snap mark (verified CV on the accent blue)
- [x] `extension/scripts/render-icons.mjs` - renders the SVG to 16/32/48 px full-bleed and 128 px with 16 px padding
- [x] `extension/public/icon/{16,32,48,128}.png` - rendered icons (committed)
- [x] `shared/src/extension-identity.ts` - `DEV_EXTENSION_ID`, `STORE_EXTENSION_ID` (empty until the store item exists), ID pattern, `originOf`, `isStoreIdSet`, `allowedExtensionOrigins`
- [x] `shared/src/extension-identity.test.ts` - dev ID derivation, allowed origins with and without a store ID, store-ID format check once set
- [x] `native-host/src/install/install.ts` - `allowed_origins` from the allowed-origins list
- [x] `native-host/src/install/cli.ts` - prints each trusted ID, or a note that the store ID isn't set
- [x] `native-host/src/install/install.test.ts` - manifest with both origins; default from `shared`

### Key Decisions

- **The mode decides the key, nothing else**: the release manifest is the dev manifest minus `key`,
  built by the same function, so the two can't drift apart.
- **Release output in its own folder**: WXT writes the release build to `chrome-mv3-release`, so
  `chrome-mv3` (used for loading unpacked) keeps the dev ID.
- **Store ID guard in `release:pack`** (approved at Stage 1): the extension zip can be built before
  the ID exists, because the first upload is what creates it. Packing the host for a release will
  require the ID (bolt 015).
- **The old `EXTENSION_ID` / `EXTENSION_ORIGIN` names are gone**: callers had to choose between dev,
  store and the allowed list.

### Deviations from Plan

- The zip is named `cv-snap-0.1.0-chrome-release.zip` instead of `cv-snap-0.1.0-chrome.zip`. WXT
  adds the mode suffix, and the suffix keeps it apart from a production zip.
- The SVG comment can't contain `--` (XML rule); it names the `icons` script instead of the
  full command.

### Dependencies Added

- [x] `@resvg/resvg-js` 2.6.2 (dev) - SVG to PNG for the icon script only

### Developer Notes

- Release zip: 1.80 MB, with no `key` and with all icons (checked in the zip's `manifest.json`).
- When the store item exists, set `STORE_EXTENSION_ID` in `shared/src/extension-identity.ts`, then
  re-run `pnpm run install-host` (or `npx cv-snap-host install`) so the host manifest trusts it.
