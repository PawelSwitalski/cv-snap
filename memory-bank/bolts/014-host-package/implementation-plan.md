---
stage: plan
bolt: 014-host-package
created: 2026-10-29T16:45:00Z
---

## Implementation Plan: host-package

### Objective

Make the native host installable from npm with `npx cv-snap-host install`: one self-contained
package (`shared` bundled), one program that serves Chrome or runs a user command depending on its
arguments, and an install that copies the runtime to a per-user directory so it keeps working after
npm cleans its cache.

### Deliverables

**Bundled host package (story 001)**
- `native-host/package.json`:
  - renamed from `@cv-snap/native-host` to `cv-snap-host`, no longer `private`;
  - `bin: { "cv-snap-host": "dist/cv-snap-host.mjs" }`, `files: ["dist", "README.md", "LICENSE"]`,
    `engines.node: ">=24"`, `license: "MIT"`, `repository` (placeholder URL until the GitHub repo
    exists; bolt 016 fills it in);
  - `dependencies` holds only `pdfjs-dist`; `@cv-snap/shared` and `zod` move to
    `devDependencies`, because they are bundled.
- `native-host/scripts/bundle.mjs`: uses **rolldown** (already in the lockfile through Vite, so no
  new download). It bundles `src/main.ts`, `shared` and `zod` into one ESM file,
  `dist/cv-snap-host.mjs`, with a `#!/usr/bin/env node` banner. `pdfjs-dist` stays external,
  because pdf.js loads its worker file relative to itself.
- `build` = typecheck (`tsc --noEmit`) + bundle. The per-file `tsc` output is no longer used, and
  the e2e tests run the bundle.
- Root scripts `install-host` / `uninstall-host` run the bundle (`cv-snap-host install`), so
  development goes through the same code path as users.
- A placeholder `native-host/README.md` (a short pointer; bolt 016 writes the real one) and the
  `LICENSE` file are part of the package. The MIT `LICENSE` is written in bolt 016; until then the
  pack test only checks for the README.

**One command for users and Chrome (story 002)**
- `src/cli/route.ts` (pure): `routeArgs(argv)` returns one of these:
  - `{ kind: "host" }` when any argument starts with `chrome-extension://`; on Windows Chrome also
    passes `--parent-window=<n>`, which is ignored;
  - `install` / `uninstall` (with `--purge`), `--version`, `--help`;
  - `{ kind: "usage", exitCode: 2 }` for no arguments or an unknown one.
- `src/main.ts` routes, then lazily imports `host-main.ts` (today's `main.ts`: logger, console
  redirect, `runHost`) or `cli/commands.ts`. In CLI mode nothing touches stdout redirection, and in
  host mode stdout carries frames only.
- `doctor` belongs to bolt 015 (story 005). Until then, usage lists only the commands that exist.
- `install/cli.ts` is folded into `cli/commands.ts`. The Windows-only guard stays until bolt 015.

**Install to a stable location (story 003)**
- Layout under `%LOCALAPPDATA%\cv-snap\host\`:
  - `runtime/`: `cv-snap-host.mjs`, `package.json`, and `node_modules/pdfjs-dist/` (an allowlist:
    `package.json`, `LICENSE`, `legacy/build/pdf.mjs`, `legacy/build/pdf.worker.mjs`, `cmaps/`,
    `standard_fonts/`, `wasm/`; about 7 MB instead of 35 MB);
  - `cv-snap-host.cmd` (launcher → `node runtime\cv-snap-host.mjs`) and the host manifest, as
    today.
- `src/install/runtime.ts`: `stageRuntime({ sourceBundle, pdfjsRoot, hostDir })`.
  - It copies into `runtime.new/`, then renames `runtime/` → `runtime.old/` and `runtime.new/` →
    `runtime/`, and removes `runtime.old/`.
  - Any failure before the swap removes `runtime.new/` and leaves `runtime/` untouched.
  - If the rename fails with `EBUSY`/`EPERM` (Windows: the host is running), it rolls back and
    throws `HostInUseError`. The CLI prints "Close the cv-snap side panel (or Chrome), then run
    install again" and exits 1.
  - The `pdfjs-dist` root is resolved with `createRequire(import.meta.url)`. That works in the npx
    cache (hoisted) and in the pnpm workspace (symlink, copied dereferenced).
- `uninstall` removes the registration, `runtime/`, the launcher and the manifest. Logs live in
  `cv-snap\logs` and stay unless `--purge` is given, which removes the whole `cv-snap` directory.
  Today's behaviour of removing only `host/` is kept, plus `--purge`.

### Dependencies

- `rolldown` 1.2.15 (dev, native-host): it is in the lockfile already. The story suggested esbuild;
  rolldown does the same job without a new package.

### Technical Approach

- Routing is a pure function. That keeps the dangerous case, a user command writing to the stdout
  that Chrome reads as frames, testable without processes.
- The swap is a pair of renames inside one directory, so it is atomic enough per step and
  recoverable at every point. The tests inject `fs` failures at each step.
- The package is verified by actually packing it: `pnpm pack` into a temp dir, list the tarball,
  install it into an empty dir, run `--version`, measure the size.

### Acceptance Criteria

- [ ] Package: `cv-snap-host`, with bin, files, engines `>=24`, MIT and repository; no `workspace:`
  in the packed `package.json`
- [ ] Tarball holds only `dist/`, the README and `package.json` (no tests, fixtures or memory-bank);
  unpacked size ≤ 15 MB
- [ ] `npx <tgz> --version` in an empty dir prints the version
- [ ] A `chrome-extension://` argument → host mode, frames only on stdout; user commands print
  readable output; unknown or no arguments → usage, exit 2
- [ ] `install` copies the runtime to `host\runtime` and the launcher points there; the host works
  with the source directory deleted (the "npx cache cleared" case)
- [ ] Re-install upgrades in place; a failed copy leaves the old runtime working; a locked runtime
  reports "close the panel"
- [ ] `uninstall` removes runtime, launcher, manifest and registration, keeping logs; `--purge`
  removes logs too
- [ ] `pnpm run install-host` still works in the repo
