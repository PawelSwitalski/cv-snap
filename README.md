# cv-snap

Chrome extension (Manifest V3) that tailors your CV to the job ad open in the current tab with one
click, using your local Claude Code. Every claim in the generated CV is checked against a CV profile
you reviewed, so nothing is invented.

> Status: early development. The scaffold and shared contracts exist; features arrive bolt by bolt
> (see `memory-bank/`).

## Repository layout

```text
cv-snap/
├── extension/    # WXT + React Chrome extension (side panel, background worker, content scripts)
├── native-host/  # Node.js native-messaging host that runs headless Claude Code
└── shared/       # zod schemas + types shared by both: CV profile, job requirements,
                  # tailoring plan, native-messaging protocol, error codes, provider interface
```

## Prerequisites

- Windows 11 (macOS/Linux: code is portable but untested)
- Node.js ≥ 24
- pnpm 12 (`npm install -g pnpm` or `corepack enable pnpm`)
- Google Chrome (stable)
- Claude Code ≥ 2.1.302, logged in (`claude auth status`), needed from the generation features on

## Development setup

```sh
pnpm install          # installs all workspaces and the git pre-commit hook
pnpm build            # shared → native-host → extension
pnpm dev              # builds shared, then starts WXT: opens Chrome with the extension loaded
```

`pnpm dev` launches a separate Chrome profile with the unpacked extension. Click the cv-snap toolbar
icon to open the side panel.

To load the production build manually instead: `pnpm build`, then in `chrome://extensions` enable
**Developer mode** → **Load unpacked** → select `extension/.output/chrome-mv3`.

## Quality checks

```sh
pnpm typecheck        # tsc --noEmit in every package
pnpm lint             # ESLint (typescript-eslint strictTypeChecked), zero warnings allowed
pnpm format:check     # Prettier (printWidth 100); `pnpm format` to fix
pnpm test             # Vitest (shared, native-host, extension projects)
pnpm test:coverage    # with coverage; thresholds 80% for shared/ and native-host/
```

The pre-commit hook (husky + lint-staged) runs ESLint and Prettier on staged files and blocks the
commit on any problem.

## Conventions

See `memory-bank/standards/` (tech stack, coding standards, architecture, UX guide). In short:

- TypeScript strict with `noUncheckedIndexedAccess`; no `any`; no `console` outside the logger
  modules (stdout is the native-messaging channel in the host).
- Anything that crosses the native-messaging connection is defined in `shared/` and validated with
  zod on receipt. `shared/src/index.ts` is the only barrel export.
- `TODO`/`FIXME` comments need a reference: `TODO(006-deterministic-validator): …` or `TODO(#12)`.
- Never log CV contents, job-ad text or personal data.
- `exampleCV/` (raw sample CVs) is git-ignored; test fixtures must be anonymized.
