---
stage: test
bolt: 014-host-package
created: 2026-10-29T17:55:00Z
---

## Test Report: host-package

### Summary

- **Tests**: 983/983 passed across the repo (`pnpm test`), 47 of them new in this bolt.
- **Coverage**: `commands.ts` 98% statements, `runtime.ts` 100%; repo total 95% (threshold 80%).
- **Typecheck, lint, Prettier**: clean.
- **npx smoke check**: in an empty directory, `npx ./cv-snap-host-0.1.0.tgz --version` printed
  `0.1.0`; without arguments it printed the usage with exit code 2. npm installed `pdfjs-dist`
  from the registry, as it will for users.
- **Manual check**: ✅ passed (user, 2026-10-29T18:10:00Z)

### Test Files

- [x] `native-host/src/cli/route.test.ts`: Chrome origin → host (with and without
  `--parent-window`); every user command; no arguments and unknown arguments → usage naming the
  argument; usage lists no command that doesn't exist yet.
- [x] `native-host/src/install/runtime.test.ts` (real files in a non-ASCII temp path, with a failure
  injected per step):
  - copies the bundle, the runtime `package.json` and only the allowlisted pdf.js files;
  - still works with the source deleted;
  - upgrades in place and drops files of the old version;
  - copy failure → old runtime untouched, no `runtime.new` left;
  - lock while moving the old runtime → `HostInUseError`, nothing changed;
  - failure moving the new runtime in → the old one is put back;
  - an undeletable `runtime.old` doesn't fail the install;
  - an interrupted earlier install is repaired;
  - `resolvePdfjsRoot` finds the real package with every allowlisted file.
- [x] `native-host/src/cli/commands.test.ts`: version, help (stdout, exit 0), usage (stderr,
  exit 2); install copies the runtime and points the launcher at it; a file lock → "close the side
  panel", exit 1, old install intact; other errors are rethrown; non-Windows refused (bolt 015);
  uninstall keeps logs, `--purge` deletes them.
- [x] `native-host/test/e2e.test.ts` (new cases): `--version` and usage through a real process;
  a runtime staged from a copy of the package, with that copy deleted, answers health and
  **extracts a PDF** through the allowlisted pdf.js.
- [x] `native-host/test/package.test.ts`: `pnpm pack` of the real package, unpacked:
  - name, bin, engines, MIT, repository, not private, only `pdfjs-dist` as dependency;
  - no `workspace:` and no `@cv-snap/shared` import left;
  - only allowlisted files;
  - ≤ 15 MB unpacked;
  - `--version` runs from the unpacked package.

### Acceptance Criteria Validation

**Story 001-bundled-host-package**
- ✅ **`cv-snap-host` with bin, files, engines, MIT, repository, no `workspace:`** (package.test)
- ✅ **Tarball holds only runtime files and docs** (package.test: `package.json`, `README.md`,
  `dist/cv-snap-host.mjs`)
- ✅ **`npx ./cv-snap-host-<v>.tgz --version` in an empty dir prints the version** (smoke check;
  the unpacked-package case is automated)
- ✅ **≤ 15 MB unpacked** (package.test; actual 0.29 MB)
- ✅ **Edge: `pnpm run install-host` still works in the repo** (manual check, step 1)

**Story 002-cli-command-routing**
- ✅ **Chrome origin → native messaging, frames only on stdout** (route.test, all e2e host cases)
- ✅ **User commands do their job with readable output** (commands.test, e2e)
- ✅ **Unknown argument → usage, exit 2; no arguments → usage, exit 2** (route.test,
  commands.test, e2e)

**Story 003-stable-install-location**
- ✅ **Runtime copied to the per-user host directory, launcher points there** (commands.test)
- ✅ **Works after the npx cache is deleted** (runtime.test, e2e with PDF extraction)
- ✅ **Upgrade in place; a failed copy keeps the previous install** (runtime.test)
- ✅ **Uninstall removes runtime, launcher, manifest and registration; logs kept unless
  `--purge`** (commands.test)
- ✅ **Edge: host running during an upgrade → reported, asks to close the panel**
  (runtime.test, commands.test; real lock: optional manual step 4)

### Issues Found

- `npx <absolute Windows path>.tgz` treats the path as a command name and does nothing; the
  relative `./…tgz` form from the story works, and so does a `file:` prefix. This is npm
  behaviour; the README (bolt 016) should use the `./` form.

### Manual check (✅ passed, user)

1. `pnpm run install-host`. The output lists `runtime: …\cv-snap\host\runtime\cv-snap-host.mjs`.
2. Reload the extension in `chrome://extensions`. The setup check passes (host found, version
   0.1.0).
3. Upload a CV PDF (or re-upload in Settings). The text is extracted, which shows pdf.js runs from
   the installed runtime.
4. Optional: with the side panel open and a CV being generated, run `pnpm run install-host` again.
   Either it succeeds, or it says to close the side panel and the host keeps working.
