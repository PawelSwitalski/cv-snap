---
stage: implement
bolt: 002-cv-tailoring-core
created: 2026-10-25T18:03:30Z
---

## Implementation Walkthrough: cv-tailoring-core (monorepo scaffold + shared contracts)

### Summary

Created the pnpm monorepo with three packages (`shared`, `native-host`, `extension`) and the full
quality toolchain (strict TypeScript, ESLint, Prettier, Vitest, husky + lint-staged), then
implemented the `shared/` contracts: zod schemas for the CV profile, job requirements and tailoring
plan, the native-messaging protocol, error codes, models and the `CvGenerationProvider` port.
Build, typecheck, lint and format checks pass; tests are written in Stage 3.

### Structure Overview

`shared/` is a plain TypeScript library built with `tsc` into `dist/` and consumed by the other two
packages as `workspace:*`. `native-host/` is a Node program (placeholder entry + stderr JSON logger).
`extension/` is a WXT + React app with a background worker that opens an empty side panel. Root
config files hold all tooling; Vitest runs one project per package.

### Completed Work

- [x] `package.json`, `pnpm-workspace.yaml` - workspace definition and root scripts (build, dev, typecheck, lint, format, test, coverage)
- [x] `tsconfig.base.json` - shared strict compiler settings (`strict`, `noUncheckedIndexedAccess`, NodeNext)
- [x] `eslint.config.js` - flat config: strictTypeChecked, no-any, no-floating-promises, no-console, react-hooks, local "TODO needs a reference" rule
- [x] `.prettierrc.json`, `.prettierignore`, `.editorconfig`, `.gitattributes`, `.gitignore` - formatting and repo hygiene (LF endings; `exampleCV/` ignored)
- [x] `vitest.config.ts`, `extension/vitest.config.ts` - per-package test projects; 80% coverage thresholds for shared/native-host
- [x] `.husky/pre-commit` - runs lint-staged (ESLint + Prettier on staged files)
- [x] `README.md` - prerequisites, setup, dev loop, quality checks, conventions
- [x] `shared/src/language.ts` - ISO 639-1 language code schema
- [x] `shared/src/ids.ts` - opaque ID schema, collision-free ID generator, duplicate finder
- [x] `shared/src/models.ts` - selectable Claude models and the default (Sonnet 5.5)
- [x] `shared/src/errors.ts` - error code union, error payload schema, `CvSnapError`, safe conversion of unknown errors
- [x] `shared/src/cv-profile.ts` - profile content schema (Claude output), persisted profile schema with version and unique-ID rule, ID collection
- [x] `shared/src/job-requirements.ts` - job requirements schema with nullable/unknown facts
- [x] `shared/src/tailoring-plan.ts` - plan schema: cited lines, ranked items, skills, headings, gaps
- [x] `shared/src/protocol.ts` - host name, size limits, progress steps, request union, host frames, response data map, safe request parser
- [x] `shared/src/provider.ts` - `CvGenerationProvider` port with model, `AbortSignal` and progress callback
- [x] `shared/src/json-schema.ts` - converts AI-output schemas to JSON Schema for `claude --json-schema`
- [x] `shared/src/parse.ts` - parse helper returning readable, multi-line error messages
- [x] `shared/src/index.ts` - the single barrel export
- [x] `native-host/src/main.ts`, `native-host/src/lib/logger.ts` - placeholder entry and JSON-lines stderr logger
- [x] `extension/wxt.config.ts` - manifest: five permissions, no host permissions, optional `https://*/*`, side panel on action click
- [x] `extension/src/entrypoints/background.ts`, `extension/src/entrypoints/sidepanel/*`, `extension/src/lib/logger.ts` - background worker, empty side panel, dev logger

### Key Decisions

- **TypeScript 6.0.3 pinned**: typescript-eslint 8.72 supports `<6.1`; TS 7 waits for it.
- **`shared` built to `dist/` with `tsc`**: Node (host) needs JS; one build path for both consumers.
- **Two profile schemas**: content (what Claude returns, JSON-Schema-friendly) vs persisted (version, confirmation, timestamps, unique-ID refinement).
- **Nullable facts everywhere a source may be silent** (dates, company, location, seniority `unknown`): spike 001 showed required fields get fabricated.
- **Structured dates (`{year, month}`)**: language-independent facts the validator can compare across translations (FR-11).
- **Cancel reuses the target `requestId`**: the cancelled request answers `CANCELLED`; cancel has no reply of its own.
- **Error payload gains optional `reason`**: carries sub-causes like `NO_TEXT` without new top-level codes.
- **Hook calls `node_modules/.bin/lint-staged` directly**: works regardless of how pnpm is installed (see notes).

### Deviations from Plan

- The local pnpm shim problem (below) means nested `pnpm` calls inside scripts fail from cmd/PowerShell on this machine; checks were run via Git Bash. No change to the scripts themselves.
- `.gitattributes` added (LF endings, binary PDFs/images), not in the plan.
- Test stage: the host logger now writes to `process.stderr` directly instead of `console.error` (testable, no console formatting, no lint exception needed).

### Dependencies Added

- [x] `zod` (shared) - schemas and validation; built-in JSON Schema conversion
- [x] `react`, `react-dom` (extension) - UI
- [x] `wxt`, `@wxt-dev/module-react`, `@types/react`, `@types/react-dom`, `happy-dom` (extension, dev) - extension framework, typings, DOM for tests
- [x] `web-ext` (extension, dev, added in test stage) - WXT 0.21 needs it as a peer to open Chrome on `pnpm dev`
- [x] `typescript@6.0.3`, `eslint`, `@eslint/js`, `typescript-eslint`, `eslint-plugin-react-hooks`, `globals`, `prettier`, `vitest`, `@vitest/coverage-v8`, `husky`, `lint-staged`, `@types/node` (root, dev) - tooling

### Developer Notes

- **Local pnpm install is incomplete**: `%APPDATA%\npm\node_modules\pnpm\pnpm` is still the placeholder (native binary never linked), so `pnpm.cmd` fails in cmd/PowerShell and inside scripts. Git Bash works. Fix suggested to the user (reinstall pnpm with lifecycle scripts, or use corepack).
- `wxt prepare` runs on install and generates `extension/.wxt/` (types, tsconfig base); it is git-ignored.
- `.claude/` and `.specsmd/` are currently untracked and will be committed unless ignored; left for the user to decide.
