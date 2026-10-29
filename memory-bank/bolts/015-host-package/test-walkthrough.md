---
stage: test
bolt: 015-host-package
created: 2026-10-29T19:40:00Z
---

## Test Report: host-package (part 2)

### Summary

- **Tests**: 1,039 passed, 1 skipped (`pnpm test`), 57 new in this bolt. The skipped one runs the
  real shell launcher and runs only off Windows (CI in bolt 016).
- **Coverage**: repo 95%; `platform.ts` 100%, `doctor.ts` 96%, `install.ts` 97%, `commands.ts`
  95%.
- **Typecheck, lint, Prettier**: clean.
- **Package**: `cv-snap-host-0.1.0.tgz` is 2.8 MB packed and 7.4 MB unpacked, pdf.js included
  (NFR-3: ≤ 15 MB). In an empty directory, `npx ./cv-snap-host-0.1.0.tgz --version` printed
  `0.1.0` with no dependency to download.
- **On this machine**:
  - `cv-snap-host doctor` passed all 7 checks against the installed host, with paths shown as `~`;
  - `pnpm release:pack` refused (store ID, `OWNER` repository) and built nothing.
- **Manual check**: ✅ passed (user, 2026-10-29T19:55:00Z)

### Test Files

- [x] `native-host/src/install/platform.test.ts`:
  - data, host and Chrome manifest directories on Windows, macOS and Linux, including the
    `%LOCALAPPDATA%` fallback and `XDG_DATA_HOME`;
  - supported platforms;
  - `~` paths, case-insensitive on Windows only, with no false match on look-alike prefixes.
- [x] `native-host/src/install/install.test.ts` (new cases):
  - the shell launcher: exact content, and quoting of spaces, `$` and `'`;
  - `parseLauncher` round trip for both launcher kinds;
  - install on macOS and on Linux: manifest in Chrome's directory, executable launcher (`0755`,
    checked off Windows), no registry;
  - uninstall removes the manifest and host directory, keeps Chrome's directory, and is
    idempotent;
  - reading the registry value;
  - real shell launcher run (off Windows).
- [x] `native-host/src/cli/doctor.test.ts`:
  - a healthy install passes on all three OSes;
  - each failure with its fix:
    - Node < 24;
    - registry missing or pointing elsewhere (path case ignored);
    - Chrome manifest missing;
    - store ID not trusted yet;
    - damaged manifest;
    - Node removed by a version manager;
    - runtime missing;
    - foreign launcher;
    - older or missing runtime;
    - Claude missing, old or logged out;
  - logged out still shows the registration checks;
  - exit codes; the output never contains the home directory or the user name;
  - output format.
- [x] `native-host/src/cli/commands.test.ts` (new cases):
  - install and uninstall on Linux and macOS through the command;
  - `doctor` passes right after install, and fails with exit 1 when nothing is installed;
  - unsupported OS.
- [x] `native-host/src/cli/route.test.ts`: `doctor` routed, `doctor --fix` rejected, usage lists
  every command.
- [x] `scripts/release-checks.test.mjs`:
  - ready → no problems;
  - any version difference, missing or malformed store ID, `OWNER` or missing repository;
  - all reasons reported at once.
- [x] `shared/src/health.test.ts` (new cases): same major and minor accepted (patch differences,
  `v` prefix); a major, minor or unparseable difference warns; the mismatch is listed after the
  Claude issues; no comparison without an extension version.
- [x] `extension/src/features/onboarding/setup-check.test.ts` (new cases): a mismatch warns
  without blocking; a patch difference doesn't warn.
- [x] `native-host/test/package.test.ts` (updated): no runtime dependencies; only the bundle plus the
  pdf.js allowlist (no source maps); ≤ 15 MB with pdf.js.
- [x] `native-host/test/e2e.test.ts` (updated): the runtime installed from a copy of `dist/` (with
  the vendored pdf.js), with that copy deleted, answers health and extracts a PDF.

### Acceptance Criteria Validation

**Story 004-macos-linux-registration**
- ✅ **macOS: manifest in `~/Library/Application Support/Google/Chrome/NativeMessagingHosts/`**
  (platform.test, install.test, commands.test)
- ✅ **Linux: manifest in `~/.config/google-chrome/NativeMessagingHosts/`** (same tests)
- ✅ **Launcher `0755` running the installed runtime with the install-time Node; uninstall removes
  both** (install.test; the mode check and the real shell run execute on macOS and Linux in CI,
  bolt 016)
- ✅ **No admin rights, nothing downloaded** (per-user paths only; npx smoke check: no
  dependencies)
- ✅ **Edge: Node from nvm or fnm disappears → doctor warns** (doctor.test)

**Story 005-doctor-command**
- ✅ **Checks registration, launcher target, Node, allowed IDs and Claude Code (found, login,
  version)** (doctor.test, smoke check)
- ✅ **Each failure shows a fix** (doctor.test)
- ✅ **Exit 0 when all pass, else 1; no personal data** (doctor.test, commands.test)
- ✅ **Edge: not logged in → failure with the login hint, registration checks still shown**
  (doctor.test)

**Story 006-release-pack-and-version-check**
- ⏳ **`pnpm release:pack` produces the store zip and the host tarball**: the refusal path is
  verified; the success path can only run once the store ID and the repository exist (Operations).
  Both build steps it runs (`zip:release`, `pnpm pack`) are verified separately (bolt 013 smoke
  check, package.test).
- ✅ **Different versions or missing store ID → fails with the reason** (release-checks.test,
  smoke check)
- ✅ **Setup check warns on a major or minor mismatch, non-blocking** (health.test,
  setup-check.test)
- ✅ **Edge: patch difference → no warning** (health.test, setup-check.test)

### Issues Found

- **Fixed during testing:** the installer and `doctor` built paths with this machine's
  separator, while the platform table used the target OS's. On a real Mac or Linux machine the two
  agree; simulated on Windows they didn't, so `~` shortening failed. Both now build paths with the
  target OS's separator, so the simulation and the real OS behave the same.

### Manual check (✅ passed, user)

1. `pnpm run install-host`. The runtime is replaced by the new layout (pdf.js now in
   `runtime\vendor\pdfjs-dist`).
2. `node native-host/dist/cv-snap-host.mjs doctor`: 7 ✓ and "cv-snap is ready.", with no user name
   in the output.
3. Reload the extension and upload a CV PDF. The text is extracted (the vendored pdf.js works from
   the installed copy), and the setup check shows no version warning.
4. Optional: `pnpm release:pack` refuses with the two reasons and creates no `release/` folder.
