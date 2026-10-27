---
stage: test
bolt: 007-job-ad-capture
created: 2026-10-27T17:43:26Z
---

## Test Report: job-ad-capture (allowed sites + dynamic content scripts)

### Summary

- **Tests**: 45/45 passed (`vitest run --project extension src/features/allowed-sites src/features/job-ad`)
- **Coverage**: not measured (the coverage config covers `shared/` and `native-host/` only); every exported function of the 007 modules has direct tests
- **Manual Chrome check**: passed (user, 2026-10-27T18:48:57Z)

### Test Files

- [x] `extension/src/features/allowed-sites/origin.test.ts` - presets (FR-6 + StepStone, Indeed via `*.indeed.com` only), HTTPS-only "Add this site" pattern derivation (http, chrome://, file://, extension pages and invalid URLs rejected), exact-host vs wildcard matching incl. look-alike domains, site-pattern filter, labels (15 tests)
- [x] `extension/src/features/allowed-sites/allowed-sites.test.ts` - add preset (exact origins requested, metadata kept), permission request is the first call (user gesture), deny → nothing added or stored, unknown preset, add current tab, unsupported tabs never prompt, remove → permission revoked + metadata forgotten, granted permissions are the source of truth (stale metadata ignored, broad permission ignored), subscribers notified on grant and on external revocation and unsubscribed cleanly, metadata clean-up edge cases (14 tests)
- [x] `extension/src/features/job-ad/content-registration.test.ts` - registration decision table, one persistent script whose matches equal the granted site origins, update/unregister on change and idempotence, persistence kept after updates, end-to-end sync with the store through permission events, injection into already-open tabs on granted origins only (http, id-less and URL-less tabs skipped), non-site origins ignored, one failing tab doesn't stop the rest, runtime-only content script with double-injection guard, built manifest has no `host_permissions` / static `content_scripts` (16 tests)
- [x] `extension/src/features/allowed-sites/fake-chrome.ts` - in-memory Chrome APIs (permissions with events, scripting registry, tabs, storage) used by the tests

### Acceptance Criteria Validation

**Story 001-allowed-sites-management**
- ✅ **Presets and "Add this site" request the Chrome permission for that origin; denying adds nothing**
- ✅ **Removing a site revokes the permission and unregisters the content script for it** (store + registration sync test)
- ✅ **The list stays in sync with Chrome: a permission revoked in chrome://extensions disappears** (external revocation test; metadata dropped by the background listener)
- ✅ **The manifest declares no host permissions** (built manifest check)
- ✅ Real-Chrome behaviour: permission prompt per site, granted sites listed, revocation in chrome://extensions removes the site (manual check)

**Story 002-dynamic-content-scripts**
- ✅ **Content scripts are registered only for granted origins, from one registration that follows grants and revocations**
- ✅ **Registration is re-checked on start-up/install/permission change and persists across sessions**
- ✅ **Tabs opened before a grant get the script; it never runs twice** (injection + guard)
- ✅ Real Chrome: content script runs on a granted site and stops after revocation (manual check); restart persistence covered by `persistAcrossSessions` tests (restart step optional, not reported)

### Issues Found

- No defects in the 007 code.
- Found during the manual check: the content script's "ready" marker used `logger.debug`, which Chrome's console hides by default, and the check steps pointed at the wrong console. Changed to `logger.info` behind `import.meta.env.DEV` (production builds log nothing); steps corrected.
- The Stage 2 idea of a dev hook in the service worker would not work for adding sites: `permissions.request` needs a user gesture in a document. The hook is on the side panel page instead (DevTools console commands count as a user gesture there), behind `import.meta.env.DEV`, loaded by a dynamic import so production builds don't include it.

### Manual Chrome check (passed 2026-10-27, user)

1. `pnpm dev`, then in the Chrome window it opens click the cv-snap icon to open the side panel.
2. Right-click inside the side panel → **Inspect** → **Console**.
3. `await cvSnapDev.allowedSites.addPreset("pracuj")` → Chrome asks for access to pracuj.pl only. Allow → result `ok: true`. Run it once more with another preset and choose **Deny** → `{ ok: false, reason: "DENIED" }`.
4. `await cvSnapDev.allowedSites.listSites()` → only the allowed preset(s).
5. Reload cv-snap in `chrome://extensions` (WXT can't hot-reload runtime-registered scripts), open `https://www.pracuj.pl/`, press F12 on that page → Console, and look for `[cv-snap] job-ad content script ready`.
6. In `chrome://extensions` → cv-snap → **Details** → **Site access**, remove pracuj.pl. Back in the side-panel console, `await cvSnapDev.allowedSites.listSites()` → it is gone; reloading the pracuj.pl tab no longer logs the marker.
7. Add it again, close and reopen Chrome (via `pnpm dev`), open pracuj.pl → the marker appears without re-adding (registration persisted).
8. Clean up: `await cvSnapDev.allowedSites.removeSite("https://*.pracuj.pl/*")`.

### Notes

- Only scoped checks were run (a sibling bolt was testing in the same tree): extension typecheck, ESLint and Prettier on the 007 files, and the 007 test files. The parent session runs the full suite.
- The dev hook in `extension/src/entrypoints/sidepanel/main.tsx` is temporary; the settings UI (bolt 012) replaces it.

### Manual check result

- Pracuj.pl and Indeed granted via `addPreset` (both prompts allowed); `listSites()` listed both; registration logged `registered 1` → `updated 2`.
- Marker `[cv-snap] job-ad content script ready` shown on pracuj.pl.
- Revoking pracuj.pl in chrome://extensions removed it from `listSites()`; the marker no longer appeared.
