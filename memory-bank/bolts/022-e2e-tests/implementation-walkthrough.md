---
stage: implement
bolt: 022-e2e-tests
created: 2026-11-03T15:49:00Z
---

## Implementation Walkthrough: 004-e2e-tests (bolt 022)

### Summary

Playwright now runs the real one-click flow: Chromium with the e2e build of the extension, the real
bundled host over native messaging, and a fake AI provider that returns fixture JSON. The test
host is registered under its own name, so a real cv-snap install is never touched. A CI job runs
the suite on Ubuntu. During this stage, dev-only dependencies were also updated and patched at the
user's request.

### Structure Overview

- **Host**: a second adapter of the `CvGenerationProvider` port, selected only by an environment
  variable that the test launcher sets. Health checks now go through the provider, so the fake one
  reports a ready Claude.
- **Extension**: a third build mode, `e2e`. It is the dev build plus the fixture job board as a
  granted host permission and the test host name. Release and dev output are unchanged.
- **`e2e/` package**: a Playwright config, a harness (fixture job board over HTTPS, host
  registration, a browser fixture that seeds the profile and opens the real side panel), fixtures
  (job-ad page, provider JSON, test certificate), and the one-click spec.

### Completed Work

- [x] `native-host/src/providers/fake-provider.ts` - Fake AI provider: fixture answers validated by the shared schemas, normal progress steps, healthy Claude report
- [x] `native-host/src/host-main.ts` - Picks the fake provider when `CV_SNAP_FAKE_PROVIDER` is set; health goes through the provider
- [x] `shared/src/protocol.ts` - `E2E_NATIVE_HOST_NAME` (`com.cvsnap.host_e2e`)
- [x] `extension/src/build/manifest.ts` - `e2e` mode: dev manifest + `host_permissions` for `https://jobs.cvsnap.test/*`
- [x] `extension/src/lib/native-host-client.ts` - `nativeHostName(mode)`: the e2e build connects to the test host
- [x] `extension/package.json` - `build:e2e` script
- [x] `e2e/package.json`, `e2e/tsconfig.json`, `e2e/playwright.config.ts`, `e2e/.gitignore` - New workspace package (one worker, no retries, traces kept on failure)
- [x] `e2e/harness/host-registration.ts` - Launcher (env: fake provider, app data in a temp dir) and manifest; Linux/macOS inside the test profile, Windows in `HKCU\Software\Chromium`, restored afterwards
- [x] `e2e/harness/job-board.ts` - HTTPS static server for `fixtures/pages`, Chromium host mapping arguments
- [x] `e2e/harness/fixtures.ts` - `cvSnap` fixture: launch, seed the profile, open the real side panel
- [x] `e2e/fixtures/pages/job-ad.html` - Polish job ad with JSON-LD, consistent with the provider fixtures
- [x] `e2e/fixtures/provider/{profile,requirements,plan}.json` - Copies of the shared valid fixtures
- [x] `e2e/fixtures/cert/{key,cert}.pem` - Self-signed test certificate for `jobs.cvsnap.test` (test-only)
- [x] `e2e/tests/one-click.spec.ts` - Job ad → Generate → progress → preview → Download PDF
- [x] `package.json` - `test:e2e` (build shared, host, e2e extension, then Playwright)
- [x] `pnpm-workspace.yaml` - `e2e` package; security overrides for dev tooling
- [x] `vitest.config.ts` - `e2e` project for harness unit tests
- [x] `.github/workflows/ci.yml` - `e2e` job (Ubuntu, cached browsers, report/trace artifacts on failure)

### Key Decisions

- **Side panel, approach A (no product change)**: a trusted Playwright click in an extension tab
  calls `chrome.sidePanel.open({ tabId })`. Playwright doesn't list side panels, so the panel is
  reached over a second CDP connection (`--remote-debugging-port=0`, port read from
  `DevToolsActivePort`) and identified as the `sidepanel.html` page that isn't a tab. It sees the
  job-ad tab as its active tab, as in real use. Fallback B (`?tabId=`) wasn't needed.
- **Own host name for tests**: the spike showed that Playwright's Chromium reads
  `HKCU\Software\Chromium`, not `Software\Google\Chrome`. A separate name
  (`com.cvsnap.host_e2e`) still keeps the test registration independent of a real install, on
  every OS.
- **Fixture site as a granted host permission (e2e build only)**: the existing allowed-sites logic
  registers the content script from granted permissions, so no dialog appears and nothing in the
  product changes.
- **Privacy notice acknowledged through the UI**: the test clicks "I understand, continue" instead
  of seeding its storage version, so it keeps working when the notice version goes up (bolt 025).

### Deviations from Plan

- The Windows registration uses only `HKCU\Software\Chromium` (checked empirically) instead of
  the Chrome key.
- **Dependency updates (user request, mid-stage)**:
  - Patch/minor updates: `@types/node` 26.6.6, `eslint` 10.14.0, `typescript-eslint` 8.72.1,
    `globals` 17.14.0, `wxt` 0.21.5, `rolldown` 1.2.16, `pdfjs-dist` 6.5.438 (third-party
    notices regenerated), `fake-indexeddb` 6.2.7, `lucide-react` 1.66.0.
  - New package: `@types/chrome` 0.3.7, `@playwright/test` 1.64.1.
  - `pnpm.overrides` for `node-forge` ≥ 1.4.1 and `minimatch` ≥ 11.0.1.
  - Audit: 14 → 1 (low, `deepmerge` in web-ext's addons-linter, no fix published). All were in
    dev tooling.
  - TypeScript 7 (major) was not taken.

### Dependencies Added

- [x] `@playwright/test` 1.64.1 - E2E runner (`e2e/` only, not shipped)
- [x] `@types/chrome` 0.3.7 - Types for `chrome.*` calls inside `evaluate` (`e2e/` only)

### Developer Notes

- `pnpm test:e2e` builds before running; for repeated runs, `pnpm --filter @cv-snap/e2e test` is
  enough after a `build:e2e`.
- First run on a machine: `pnpm --filter @cv-snap/e2e exec playwright install chromium`.
- **Found while checking the e2e build (pre-existing, not fixed here)**: WXT sets
  `NODE_ENV` to the build mode, so `import.meta.env.DEV` is true for any mode other than
  `production`, including `release`. The 0.1.0 and 0.1.1 store zips therefore contain the dev
  console hook (`chunks/dev-hook-*.js`, the `cvSnapDev` handle) and print `[cv-snap]` debug lines
  (side panel), plus "job-ad content script ready" in the console of every allowed job page. The
  hook is reachable only from the extension's own DevTools, and the logger never gets CV or ad
  text, but none of this is intended for the store build. It should be fixed in a construction bolt (e.g. gate on
  `import.meta.env.MODE`), with a check in `release-pack`.
