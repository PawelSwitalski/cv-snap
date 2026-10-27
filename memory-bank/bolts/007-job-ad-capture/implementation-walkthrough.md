---
stage: implement
bolt: 007-job-ad-capture
created: 2026-10-25T20:30:56Z
---

## Implementation Walkthrough: job-ad-capture (allowed sites + dynamic content scripts)

### Summary

The extension now has an allowed-sites store/API (presets, "Add this site" for the current tab,
remove, live list) backed only by Chrome's granted host permissions, and a content script that is
registered at runtime exactly for the granted origins. Registrations are reconciled on install,
browser start and every permission change, and newly granted sites get the script injected into
tabs that were already open. No UI was added; the settings UI bolts call this API.

### Structure Overview

`features/allowed-sites/` holds the pure parts (presets, URL → match pattern, pattern matching)
and the store, which reaches Chrome only through a small `ChromeApis` seam so tests can use fakes.
`features/job-ad/` holds registration reconciliation (a pure decision plus the Chrome calls) and
open-tab injection. The background worker wires these to Chrome events; the content-script
entry is built by WXT but never declared in the manifest.

### Completed Work

- [x] `extension/src/features/allowed-sites/presets.ts` - seven job-board presets (FR-6 + StepStone) with HTTPS match patterns; lookup by id and by pattern
- [x] `extension/src/features/allowed-sites/origin.ts` - "Add this site" URL → `https://host/*` (non-HTTPS and invalid URLs rejected with a reason), pattern-to-URL matching, labels, site-pattern check
- [x] `extension/src/features/allowed-sites/chrome-apis.ts` - the Chrome API seam (permissions, scripting, tabs, storage) and its real implementation via WXT's `browser`
- [x] `extension/src/features/allowed-sites/allowed-sites.ts` - store/API: list (granted permissions + display metadata), add preset, add current tab, remove (revokes), subscribe to changes; metadata clean-up for revoked patterns
- [x] `extension/src/features/job-ad/content-registration.ts` - registration plan (register / update / unregister / unchanged), idempotent reconcile with `persistAcrossSessions`, injection into already-open matching tabs
- [x] `extension/src/entrypoints/job-ad.content.ts` - runtime-registered content-script skeleton with a double-injection guard (detection and extraction come in bolt 008)
- [x] `extension/src/entrypoints/background.ts` - reconcile on install/start-up and on permission changes; injection after a grant; metadata clean-up after a revoke

### Key Decisions

- **Granted permissions are the source of truth**: the list is computed from `permissions.getAll()`; storage holds only labels, preset ids and timestamps, so a revocation in `chrome://extensions` can't leave a stale entry.
- **`permissions.request` is the first call in add flows**: the store's add methods make no awaited call before it, so the side-panel click's user gesture is still valid.
- **One registered script for all granted origins**: a single id whose `matches` follow the grants; reconciling is a pure diff, so repeated events are harmless.
- **Runtime entry with empty `matches`**: WXT adds a runtime content script's `matches` to `host_permissions`; empty keeps the manifest free of host permissions (verified in the built manifest).
- **Chrome's own types for scripting**: the seam derives registration and injection types from WXT's `browser`, so fakes and the real API can't drift.

### Deviations from Plan

- Content-script updates pass the script file again (Chrome's type requires `js` on update).
- No tests yet beyond the existing suite; the store, origin parsing and reconciliation are written to be tested with fakes in Stage 3.
- The manual-check trigger (dev-only button vs service-worker console) is not built; the service-worker console can call the API directly, so no temporary UI was added.

### Dependencies Added

None.

### Developer Notes

- In a fresh checkout, `pnpm install` fails in the extension's `wxt prepare` postinstall until `shared` is built (`wxt.config.ts` imports `@cv-snap/shared`). Workaround used here: build `shared`, then run `wxt prepare`. This is a scaffold issue (bolt 002), not part of this bolt.
- Built content script path: `/content-scripts/job-ad.js` (`CONTENT_SCRIPT_FILE`).
