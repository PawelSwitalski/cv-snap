---
stage: implement
bolt: 014-host-package
created: 2026-10-29T17:45:00Z
---

## Implementation Walkthrough: host-package

### Summary

The native host is now the npm package `cv-snap-host`. It ships as one bundled file plus
`pdfjs-dist`. One program serves Chrome or runs a user command depending on its arguments.
`install` copies the runtime into the per-user host directory, so the installed host no longer
depends on the npx cache or the repository.

### Structure Overview

`src/main.ts` routes the arguments (`cli/route.ts`, pure), then lazily loads either the
native-messaging host (`host-main.ts`, the previous `main.ts`) or the user commands
(`cli/commands.ts`). `install/runtime.ts` stages the runtime with a copy-then-swap. The existing
`install/install.ts` still writes the launcher, manifest and registry key; the launcher now points
at the staged runtime. `scripts/bundle.mjs` (rolldown) produces `dist/cv-snap-host.mjs`.

### Completed Work

- [x] `native-host/package.json` - renamed to `cv-snap-host`, public; bin, files, engines, MIT, repository; only `pdfjs-dist` at runtime
- [x] `native-host/scripts/bundle.mjs` - one ESM bundle with `shared` and zod inlined, `pdfjs-dist` external, single chunk
- [x] `native-host/README.md` - placeholder pointer (real README in bolt 016)
- [x] `native-host/src/main.ts` - routes Chrome vs. user commands, loads each path lazily
- [x] `native-host/src/host-main.ts` - the host as `runNativeHost()` (moved from `main.ts`, unchanged otherwise)
- [x] `native-host/src/cli/route.ts` - `routeArgs` and the usage text
- [x] `native-host/src/cli/commands.ts` - `install`, `uninstall [--purge]`, `--version`, `--help`, usage (exit 2); a locked host → "close the side panel"
- [x] `native-host/src/install/runtime.ts` - `stageRuntime` (copy to `runtime.new`, swap with renames, roll back), `HostInUseError`, pdf.js file allowlist, `resolvePdfjsRoot`
- [x] removed `native-host/src/install/cli.ts` (folded into `cli/commands.ts`) and `native-host/tsconfig.build.json` (the bundle replaces per-file output)
- [x] root `package.json` - `install-host` / `uninstall-host` run the bundle; filter renamed to `cv-snap-host`
- [x] `native-host/test/global-setup.ts`, `native-host/test/e2e.test.ts` - build and run the bundle; the host is started with the Chrome origin argument, as Chrome does
- [x] `shared/test/regression/live.mjs` - runs the bundle with the origin argument
- [x] `vitest.config.ts` - coverage excludes the new entry `host-main.ts` instead of the removed `cli.ts`

### Key Decisions

- **Routing on the origin argument**: Chrome always passes `chrome-extension://<id>/`, and a person
  never does, so that one check separates the two modes. No arguments means a person: usage,
  exit 2.
- **Lazy imports per mode**: the host's console redirection and logger are set up only in host
  mode. The CLI therefore prints normally, and the host stdout stays frames-only.
- **Runtime = bundle + its own `package.json` + allowlisted pdf.js**: Node resolves
  `pdfjs-dist` from `runtime/node_modules`, exactly like in the npm package.
- **Swap by two renames**: before the first rename nothing has changed; after a failed second
  rename the old runtime is renamed back. A leftover from an interrupted install is repaired at the
  start of the next one.
- **Locks are reported, not forced**: `EBUSY`/`EPERM`/`EACCES` while replacing or removing files
  → "Close the cv-snap side panel (or Chrome), then run the command again", exit 1.

### Deviations from Plan

- `build` is the bundle only. Type checking stays in `typecheck` (run by `pnpm typecheck` and the
  pre-commit hooks), instead of running `tsc` twice.
- `files` is `["dist"]`: npm adds `package.json`, `README.md` and (from bolt 016) `LICENSE` by
  itself.
- `uninstall` also turns a file lock into the "close the side panel" message (Windows locks the
  running `.cmd` launcher).

### Dependencies Added

- [x] `rolldown` 1.2.15 (dev, `cv-snap-host`) - bundler; already in the lockfile through Vite

### Developer Notes

- Bundle: `dist/cv-snap-host.mjs`, 282 KB. `pnpm pack` lists `package.json`, `README.md` and
  `dist/cv-snap-host.mjs` only. `@cv-snap/shared` becomes `0.1.0` in the packed devDependencies,
  which npm never installs for users.
- `repository.url` is a placeholder (`OWNER`). The release guard in bolt 015 must refuse it,
  next to the empty store ID.
- After this bolt, run `pnpm run install-host` once to move your installed host to the new layout
  (`%LOCALAPPDATA%\cv-snap\host\runtime`).
