---
stage: plan
bolt: 022-e2e-tests
created: 2026-11-03T15:32:00Z
---

## Implementation Plan: 004-e2e-tests (bolt 022)

### Objective

Run the real one-click flow end to end, locally on Windows and in CI on Ubuntu:
Playwright → Chromium with the unpacked extension → native messaging → the real bundled host →
a **fake AI provider** (canned JSON). No Claude Code, no network, and the user's real cv-snap
install is never touched.

### Deliverables

1. **Fake AI provider (host)**: story 001
   - `native-host/src/providers/fake-provider.ts`: implements `CvGenerationProvider`. It reads
     `profile.json`, `requirements.json` and `plan.json` from a fixtures directory, validates them
     with the shared schemas, and emits the same progress steps as `ClaudeCodeProvider`.
   - `host-main.ts`: picks the fake provider only when `CV_SNAP_FAKE_PROVIDER=<dir>` is set in the
     host's environment. Nothing in the protocol can select it.
   - The fake health check reports Claude as found and logged in when the fake provider is active,
     so the setup check passes.
2. **E2E build mode (extension)**: `wxt build --mode e2e` is the dev manifest (same `key` and
   dev ID) plus two differences:
   - `host_permissions: ["https://jobs.cvsnap.test/*"]`. The site is granted at install, so the
     existing allowed-sites logic registers the content script with no permission dialog.
   - Native host name `com.cvsnap.host_e2e`, a build-time define read by `native-host-client.ts`.
     The test registration therefore can't collide with a real `com.cvsnap.host` install
     (on Windows, Chrome for Testing reads the same `HKCU\Software\Google\Chrome` key as Chrome).
   - `buildManifest` unit tests cover the new mode. Release and dev manifests stay unchanged.
3. **`e2e/` workspace package** (`@cv-snap/e2e`, private): story 002
   - `playwright.config.ts`: Chromium, `channel: "chromium"` (new headless supports extensions),
     one worker, traces on the first retry, HTML report.
   - `global-setup.ts`:
     - builds the shared package, the host bundle and the e2e extension;
     - starts an HTTPS static server for `fixtures/pages/` with a self-signed certificate;
     - Chromium is launched with `--host-resolver-rules=MAP jobs.cvsnap.test 127.0.0.1:<port>`
       and `--ignore-certificate-errors`.
   - `harness/host-registration.ts` writes the manifest `com.cvsnap.host_e2e` with
     `allowed_origins` set to the dev ID, pointing to a launcher (`.cmd` / shell). The launcher
     sets `CV_SNAP_FAKE_PROVIDER`, points `LOCALAPPDATA` / `XDG_DATA_HOME` to a temp directory
     (so logs stay out of the real app-data), then runs `node native-host/dist/cv-snap-host.mjs`.
     - Linux / macOS: `<user-data-dir>/NativeMessagingHosts/`, inside the temporary test
       profile, so nothing outside it changes.
     - Windows: `HKCU\Software\Google\Chrome\NativeMessagingHosts\com.cvsnap.host_e2e`, removed
       in teardown. Any existing key with that name is backed up and restored.
   - `harness/fixtures.ts`: a Playwright fixture that
     - launches a persistent context (temp `userDataDir`, `--load-extension`) and waits for the
       service worker to get the extension ID (it asserts the dev ID);
     - seeds `storage.local` through the service worker: the confirmed fixture profile, the
       privacy notice acknowledged, and default settings;
     - opens the side panel next to the job-ad tab (see "Side panel" below).
   - `fixtures/`:
     - `pages/job-ad.html`: an English job ad with JSON-LD `JobPosting`;
     - `provider/{profile,requirements,plan}.json`: consistent with that ad and with each other,
       and passing the validator.
   - Scripts: root `pnpm test:e2e` (build, then `playwright test`). Vitest doesn't pick up `e2e/`.
4. **One-click test**: story 003, `e2e/tests/one-click.spec.ts`
   - Opens `https://jobs.cvsnap.test/job-ad.html` and then the side panel. Clicks Generate.
   - Asserts the progress steps appear in order and the preview shows the fixture plan's job
     title and a rephrased bullet.
   - Clicks Download PDF and asserts on the download: its name follows the file-name rules and
     its first bytes are `%PDF`.
5. **CI job**: story 004, a new `e2e` job in `.github/workflows/ci.yml` (ubuntu-latest)
   - Cache the Playwright browsers, run `pnpm exec playwright install --with-deps chromium`,
     then `pnpm test:e2e`.
   - Upload `e2e/playwright-report` and the traces as artifacts on failure.
   - `retries: 0` in CI, so flakiness shows up instead of being hidden. The "10 green runs"
     rule goes into the 0.2.0 release checklist.

### Side panel: the main uncertainty (spike first)

The Generate view captures **the active tab of the side panel's window**
(`activeTabIdOfHostWindow`). If `sidepanel.html` is opened as an ordinary tab, it becomes its own
active tab, and capture fails. Playwright can't click the toolbar icon, and `sidePanel.open()`
needs a user gesture. Order of attempts, timeboxed:

- **A (preferred, no product changes):** in a helper extension tab, add a click listener with
  `page.evaluate` that calls `chrome.sidePanel.open({ tabId: <job-ad tab> })`. Playwright's click
  is trusted input, so it counts as a user gesture. Then attach to the side-panel target
  (`context.pages()` / `waitForEvent("page")`, or CDP `Target.attachToTarget` when it isn't listed
  as a page).
- **B (fallback):** the e2e build reads a `?tabId=` query parameter in
  `activeTabIdOfHostWindow`. It's compiled out of dev and release builds (build-time define) and
  unit-tested. The tests then open `sidepanel.html?tabId=<id>` in a tab of its own.

If both fail, I stop and come back to you before going further (replan).

### Dependencies

- `@playwright/test` (exact version; no newer than two weeks old) in `e2e/` only. It is a dev
  dependency and isn't shipped.
- Small HTTPS static server: Node `https` + `selfsigned` (dev), or a pre-generated certificate
  committed under `e2e/fixtures/cert/` (test-only, no secret value). I'd use the committed
  certificate so there's no extra dependency.
- No changes to the shipped host behaviour or the published package contents. The fake provider
  is in the bundle, but inactive without the variable. A test asserts that no protocol message
  can enable it, and `package.test.ts` still passes.

### Technical Approach

- Same `CvGenerationProvider` port, so the fake provider is about 60 lines. Progress events go
  through the same `onProgress` callback.
- Everything specific to e2e is either behind `mode === "e2e"` at build time (extension) or
  behind an environment variable (host). The release build stays byte-identical in behaviour.
  The existing release-pack checks continue to cover the store zip (no `key`, CSP).
- The harness lives in `e2e/harness/` with small pure helpers (manifest content, launcher text,
  registry commands). Those get Vitest unit tests: a new `e2e` Vitest project that runs only
  `harness/**/*.test.ts`.

### Acceptance Criteria

- [ ] `CV_SNAP_FAKE_PROVIDER` set → the host answers profile, requirements and tailor from the
  fixtures with normal progress. Unset → `ClaudeCodeProvider` (unit and host e2e tests).
- [ ] No extension message can switch the provider (test).
- [ ] `wxt build --mode e2e` manifest: dev `key`, the fixture host permission and the e2e host
  name. Dev and release manifests are unchanged (tests).
- [ ] `pnpm test:e2e` on Windows: the one-click test passes. Afterwards no
  `com.cvsnap.host_e2e` registry key is left, and an existing `com.cvsnap.host` is untouched.
- [ ] The one-click test asserts the progress steps, the preview content and a `%PDF` download
  with the expected file name.
- [ ] The CI `e2e` job is green on Ubuntu and uploads the report and trace on failure.
- [ ] `pnpm test`, `typecheck`, `lint` and `format:check` stay green.
- [ ] The side-panel approach (A or B) is recorded in the implementation walkthrough.
