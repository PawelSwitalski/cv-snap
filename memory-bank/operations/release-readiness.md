---
intent: 001-one-click-tailored-cv
created: 2026-10-29T15:50:00Z
status: blocked
---

# Release Readiness: cv-snap 0.1.0

The extension's Chrome Web Store (CWS) package and the native host's npm package
(`npx cv-snap-host install`). Assessed after construction of intent 001 completed (12 bolts, 922
tests, manual Chrome checks passed).

## Environments for this product

cv-snap has no servers, so "deploying" means publishing two packages. The required progression maps
to:

- **Development**: a production build loaded unpacked on a clean Chrome profile, plus the host
  installed from the packed npm tarball (`npm pack` → `npx ./cv-snap-host-<v>.tgz install`) on a
  clean Windows user.
- **Staging**: CWS listing as **unlisted / trusted testers**, plus the host on npm under the
  `next` dist-tag. A few real users install it the real way.
- **Production**: the public CWS listing, plus the npm `latest` dist-tag.
- **Monitoring**: there is no telemetry, by design (privacy). It consists of the CWS developer
  dashboard (installs, uninstalls, ratings, reviews), npm downloads, GitHub issues, and the host's
  local log file for support (it never contains CV or ad text).

**Rollback**: CWS can't roll back to an earlier upload, so a fix is published as a new version.
On npm, `npm dist-tag` moves `latest` back to the previous version, and a broken version is
deprecated. The two packages must stay protocol-compatible across one version step (the health
check already reports host/extension versions).

## Blockers (need code changes → Construction)

1. **Extension ID in the store differs from the dev ID.** The manifest has a fixed `key`
   (ID `mmchm…`) so the host can allow exactly this extension. The CWS item has its own ID and key,
   assigned when the item is first created. The store build must leave out the `key` field, and
   the host's `allowed_origins` must include the store ID (and the dev ID for development builds).
   Without this, the store version can't connect to the host at all.
2. **The npx install points into the npx cache.** `install` writes a launcher that runs
   `dist/main.js` from wherever the package was executed. With `npx`, that is
   `%LocalAppData%\npm-cache\_npx\…`, which npm may clear at any time, and the host would then
   silently break. The installer must copy the host runtime into its own directory
   (`%LocalAppData%\cv-snap\host`) and point the launcher there.
3. **The host isn't publishable.**
   - `@cv-snap/native-host` is `private`, scoped and depends on the private workspace package
     `@cv-snap/shared`. It needs to be published as `cv-snap-host` (the name is free on npm today)
     with `shared` bundled in.
   - `files` must be limited to the runtime, plus `engines` (Node ≥ 24) and the repository and
     license fields.
   - `npx cv-snap-host install` must reach the installer. Today the `bin` is the host itself,
     which Chrome starts with an origin argument, so the subcommands `install`/`uninstall`/`doctor`
     need to be routed apart from that.
4. **No extension icons.** CWS requires 128 px, and the toolbar needs 16/32/48 px. The manifest has
   none.

## Store and legal requirements (no code, or docs only)

5. **Privacy policy URL**: required by CWS because cv-snap handles personal data (the CV). It
   should state what goes to Anthropic through the user's own Claude Code, that nothing goes to
   cv-snap servers, and what is stored locally. It can be hosted as a page in the repo (GitHub
   Pages).
6. **CWS listing**:
   - a single-purpose description;
   - a justification for each permission (`nativeMessaging`, `scripting`, `activeTab`, `storage`,
     `unlimitedStorage`, `sidePanel`, optional `https://*/*`);
   - data-use disclosures (personal info: CV/résumé);
   - screenshots (1280×800), PL and EN listing texts.
7. **LICENSE**: there is none. npm and CWS listings normally link one. Bundled Noto Sans is OFL
   (already included).
8. **README**: still says "early development". It needs the user install path (store + `npx
   cv-snap-host install`) and troubleshooting.

## Scope decisions (need the user)

- Platforms, license and staging audience: decided (below).
- **Publishing accounts**: a CWS developer account (one-time fee) and an npm account. Only the
  user can create these and publish; this agent prepares artifacts and checklists.

## Decisions (user, 2026-10-29)

- **Platforms**: Windows, macOS and Linux in the first release. Host registration on macOS/Linux
  writes the manifest into each browser's `NativeMessagingHosts` directory (Chrome; Chromium
  optional). This needs real testing on macOS and Linux: CI runners (GitHub Actions
  `macos-latest`, `ubuntu-latest`) for install/uninstall/doctor, plus at least one manual
  end-to-end check per OS before production.
- **License**: MIT.
- **Staging audience**: CWS trusted testers (listed Google accounts only).

## Ready already

- The production build works; manifest permissions are minimal, with no host permissions by
  default.
- Health check with versions and fix hints; host logs without personal data.
- The host never writes to stdout except protocol frames; all incoming messages are
  zod-validated.
- PL/EN UI; the privacy notice is in the product (versioned).

## Recommended path

1. **Inception**: a small intent `002-release-readiness` with stories for blockers 1–4, the README,
   the LICENSE and the privacy policy page plus macOS/Linux host registration with CI install tests.
2. **Construction**: one or two bolts.
3. **Operations**: build both packages with a version (0.1.0), then Dev → Verify → Staging (trusted
   testers + npm `next`) → Verify → Production → Verify → Monitoring checklist.
