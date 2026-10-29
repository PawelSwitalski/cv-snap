---
stage: plan
bolt: 013-store-ready-extension
created: 2026-10-29T16:12:48Z
---

## Implementation Plan: store-ready-extension

### Objective

Make the extension uploadable to the Chrome Web Store: a release build without the dev `key`, the
store extension ID defined next to the dev ID so the host can trust both, and the cv-snap icon in
all sizes.

### Deliverables

**Release build without the dev key (story 001)**
- `extension/manifest.ts` (pure): builds the manifest for a mode. Development and production keep
  the dev `key`. `release` mode leaves it out and is otherwise identical: name, version,
  permissions, icons, action. `wxt.config.ts` uses it (WXT passes the mode to a manifest
  function).
- Scripts in `extension/package.json`:
  - `build:release`: `wxt build --mode release`;
  - `zip:release`: `wxt zip --mode release`, which produces
    `extension/.output/cv-snap-<version>-chrome.zip` for upload.
- `pnpm dev` and `pnpm build` are unchanged (dev ID `mmchm…`), so an installed host keeps working.

**Store extension ID (story 002)**
- `shared/src/extension-identity.ts`:
  - `DEV_EXTENSION_ID` (today's ID, derived from the key);
  - `STORE_EXTENSION_ID` (empty until Operations creates the store item, then one line);
  - `ALLOWED_EXTENSION_ORIGINS`: the dev origin plus the store origin when it is set;
  - `isStoreIdSet()`.
  - The existing `EXTENSION_ID` / `EXTENSION_ORIGIN` names are replaced at their three uses.
- `native-host/src/install/install.ts`: `allowed_origins` becomes the allowed-origins list. The
  installer prints each trusted ID, and says when the store ID isn't set yet.
- A test checks that a set store ID is a valid extension ID (32 letters a–p) and differs from the
  dev ID.

**Icons (story 003)**
- `extension/assets/icon.svg`: the cv-snap mark. A rounded square in the accent blue of the badge
  (`#1F6FEB`), holding a white document with a folded corner and a check mark, meaning "a CV,
  verified". It is simple enough to read at 16 px, and the blue square shows on light and dark
  toolbars.
- `extension/scripts/render-icons.mjs`: renders the SVG with `@resvg/resvg-js` (a dev dependency,
  version 2.6.2, released 2026-01) to `extension/public/icon/{16,32,48,128}.png`.
  - 16/32/48 px use the full canvas.
  - 128 px puts the artwork in the central 96×96 with 16 px transparent padding (CWS guideline).
  - The PNGs are committed, so normal builds need no image tooling. `pnpm --filter
    @cv-snap/extension icons` re-renders them.
- The manifest gets `icons` and `action.default_icon` for all four sizes.

### Dependencies

- WXT manifest-as-function with `mode` (build-time config).
- `@resvg/resvg-js` 2.6.2 (dev only, for the icon script).
- The host installer from intent 001 (bolt 003).

### Technical Approach

- The mode-to-manifest logic lives in one pure function, so a unit test can compare the dev and
  release manifests field by field without running a build.
- A build smoke check runs `wxt build --mode release` once in the test stage and reads the output
  `manifest.json`. That covers the real WXT output, including WXT's own icon handling.
- Tests: manifest function (release lacks `key` and is otherwise equal; icons in both), identity
  constants (dev ID derivation kept, store-ID format), installer manifest (allowed origins),
  icon files (exist, PNG signature, sizes 16/32/48/128).

### Deviation from the requirement wording (for your check)

FR-2 / story 002 say "until the store ID is set, the release build refuses to produce a package".
The first store upload is what creates the item and reveals its ID, so the **extension zip must be
buildable before the ID exists**. The extension doesn't need its own store ID anyway. The guard
moves to where the ID matters: **`pnpm release:pack` (bolt 015) refuses to pack the host** while
`STORE_EXTENSION_ID` is empty, so no host that ignores the store version can ship. In this bolt,
the installer only warns.

### Acceptance Criteria

- [ ] Release manifest has no `key`; otherwise identical to the dev manifest (tested)
- [ ] `zip:release` produces the upload zip, at most 10 MB
- [ ] `pnpm dev` / `pnpm build` keep the dev ID
- [ ] `shared` defines the dev ID, the store ID and the allowed origins; a set store ID is validated
- [ ] The host manifest's `allowed_origins` equals the allowed-origins list (dev, plus store when
      set); the installer prints the trusted IDs
- [ ] `icons` and `action.default_icon` list 16/32/48/128 px PNGs; the 128 px icon has 16 px padding
- [ ] The icon is recognisable at 16 px on light and dark toolbars (manual check)
- [ ] The job-ad badge stays readable over the icon (manual check)
