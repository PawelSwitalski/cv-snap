---
stage: plan
bolt: 007-job-ad-capture
created: 2026-10-25T20:13:51Z
---

## Implementation Plan: job-ad-capture (allowed sites + dynamic content scripts)

### Objective

Let the user decide exactly which job sites cv-snap may read: one-click presets or "Add this site"
for the current tab, each backed by a per-origin Chrome host permission. Register cv-snap's content
script only for granted origins, starting right after a grant (no side-panel reload) and staying in
sync with permission changes made in `chrome://extensions` and across browser restarts.

### Deliverables

**Story 001: allowed sites management** (`extension/src/features/allowed-sites/`)
- `presets.ts`: preset list with HTTPS match patterns, subdomains included where boards use them:
  - LinkedIn `https://*.linkedin.com/*`
  - Indeed `https://*.indeed.com/*`
  - Pracuj.pl `https://*.pracuj.pl/*`
  - justjoin.it `https://justjoin.it/*`
  - NoFluffJobs `https://nofluffjobs.com/*`
  - Bulldogjob `https://bulldogjob.pl/*`
  - **StepStone** `https://*.stepstone.de/*` (from the user's list; not in FR-6, proposed)
- `origin.ts`: tab URL → match pattern for "Add this site" (`https://host/*`); http, `chrome://`,
  file and other schemes → a typed "not supported" result (story edge case "http-only site")
- `allowed-sites.ts`: the store/API used later by the settings UI (stories 005/008):
  `listSites()`, `addPreset(id)`, `addCurrentTab(url)`, `removeSite(pattern)`, `subscribe()`.
  **Chrome's granted permissions are the source of truth.** `chrome.storage.local` only keeps display
  metadata (label, preset id, added-at), so a list can't drift from what Chrome actually allows
- Add: `permissions.request({ origins: [pattern] })` must run **inside the user gesture**, so it is
  called first and synchronously from the click handler. Denied → not added. Remove: `permissions.remove`
- Sync: `permissions.onRemoved` / `onAdded` listeners (background) update metadata and notify subscribers
- Manifest unchanged: `optional_host_permissions: ["https://*/*"]`, no `host_permissions`
  (already set in bolt 002)

**Story 002: dynamic content scripts** (`extension/src/features/job-ad/content-registration.ts`, `extension/src/entrypoints/`)
- `job-ad.content.ts` content-script skeleton (WXT entry with `registration: "runtime"`, so it is
  built but **not** declared in the manifest). It only announces itself; bolt 008 fills in detection
  and extraction
- `reconcileRegistrations()`: one registered script whose `matches` = the currently granted origins
  (`scripting.registerContentScripts` / `updateContentScripts` / `unregisterContentScripts`,
  `persistAcrossSessions: true`). Runs on `runtime.onStartup`, `onInstalled`, and after
  `permissions.onAdded` / `onRemoved`
- After a grant, `scripting.executeScript` injects into already-open matching tabs (edge case "tab
  opened before grant"); a guard in the script prevents double injection
- Background wiring in `entrypoints/background.ts`

### Dependencies

- Bolt 002: WXT/React scaffold, manifest permissions (`scripting`, `storage`), logger
- WXT `browser` APIs: `permissions`, `scripting`, `tabs`, `storage` (typed by WXT; no new packages)
- No native-host or shared-contract changes, unless a shared `AllowedSite` type is needed later by the
  UI; kept extension-local for now

### Technical Approach

- Feature folder `extension/src/features/allowed-sites/`, plus `features/job-ad/` for registration,
  following the coding-standards structure. Pure logic (patterns, origin parsing, reconciliation
  diff) is separated from Chrome calls
- Chrome APIs are reached through a small injected `ChromeApis` interface, so Vitest tests use
  in-memory fakes: a permission store with grant/deny/revoke events, a scripting registry, tabs and
  storage. WXT's fake-browser (`wxt/testing`) is used where it covers the API, and custom fakes
  otherwise (`permissions` and `scripting` support in fake-browser is limited)
- Tests: preset patterns, URL → pattern (subdomains, http rejected, chrome:// rejected), add/deny/
  remove flows, external revoke → list updates, reconcile is idempotent (register / update /
  unregister / no-op), restart reconcile, injection into open tabs once
- Manual Chrome check (about 2 min): add a preset (permission prompt for that origin only), deny →
  not listed, revoke in `chrome://extensions` → disappears, open a granted site → the content script's
  console marker appears, restart Chrome → still registered. Until the settings UI exists, this is
  driven from a temporary dev-only panel button or the service-worker console, which is decided in Stage 2
- "Add this site" and the settings list **UI** belong to the UI bolts (stories 005/008). This bolt
  delivers the store/API they call

### Acceptance Criteria

**001-allowed-sites-management**
- [ ] Adding a preset requests permission for that preset's origins only
- [ ] Denying the prompt leaves the site unlisted
- [ ] "Add this site" on an unlisted HTTPS tab requests its origin and lists it on approval;
  http/non-web tabs get a "not supported" result
- [ ] Removing a site revokes the Chrome permission
- [ ] Revoking in `chrome://extensions` removes the site from the list (`permissions.onRemoved`)
- [ ] The manifest declares no `host_permissions`

**002-dynamic-content-scripts**
- [ ] A newly granted origin gets the content script registered and injected into open matching tabs
- [ ] A removed origin is unregistered
- [ ] After a browser restart, registrations match the granted origins (reconcile on startup)

### User Decisions (2026-10-25T20:25:48Z)

- Decision bundle 1–5 approved (StepStone added as a seventh preset).
- Indeed: `https://*.indeed.com/*` only (country sites such as pl./de.indeed.com are covered).
