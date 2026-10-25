---
stage: plan
bolt: 002-cv-tailoring-core
created: 2026-10-25T17:51:57Z
---

## Implementation Plan: cv-tailoring-core (monorepo scaffold + shared contracts)

### Objective

Create the pnpm monorepo (`extension/`, `native-host/`, `shared/`) with build, lint, format, test and
pre-commit tooling that matches the standards, and implement the `shared/` contracts every other
unit builds on: zod schemas for the CV profile, job requirements and tailoring plan, the native
messaging protocol, error codes, and the `CvGenerationProvider` interface. Spike findings from bolt
001 are folded in.

### Deliverables

**Story 001: monorepo scaffold**
- Root: `package.json` (scripts `build`, `dev`, `lint`, `format`, `format:check`, `test`,
  `typecheck`), `pnpm-workspace.yaml`, `tsconfig.base.json`, `eslint.config.js` (flat),
  `.prettierrc.json` (printWidth 100), `.prettierignore`, `.gitignore`, `.editorconfig`,
  `vitest.config.ts` (projects), `README.md` (dev setup), `git init`, husky + lint-staged pre-commit
- `shared/`: TS library built with `tsc` to `dist/` (ESM + `.d.ts`); `src/index.ts` = the only barrel
- `native-host/`: Node TS program built with `tsc`; placeholder `src/main.ts`; `src/lib/logger.ts`
  (stderr JSON lines, the only module allowed to use `console`)
- `extension/`: WXT + React; entry points `sidepanel` (empty panel, title only) and `background`
  (opens the side panel on toolbar click); manifest permissions limited to `storage`,
  `unlimitedStorage`, `nativeMessaging`, `scripting`, `sidePanel`, **no host permissions**
  (`optional_host_permissions: ["https://*/*"]`)
- Lint rules from coding standards: `strictTypeChecked`, `no-explicit-any`, `no-floating-promises`,
  `no-console` (except logger modules), react-hooks rules, and a small local rule rejecting `TODO`
  without a story/issue reference

**Story 002: domain schemas and contracts (`shared/src/`)**
- `language.ts`: ISO 639-1 `LanguageCode` schema
- `ids.ts`: `newId(prefix)` helper (crypto-random, stable) + uniqueness refinement helper
- `cv-profile.ts`: `CvProfileContentSchema` (what Claude returns: contact, summary, experience,
  projects, education, skills, languages, certifications, other sections; every item/bullet `id`)
  and `CvProfileSchema` (persisted: + `schemaVersion`, `sourceLanguage`, `photoRef?`, unique-ID refinement)
- `job-requirements.ts`: `JobRequirementsSchema`. Facts the ad may not state are **nullable**
  (`company`, `location`), `seniority` includes `"unknown"`, `language` ISO 639-1 (spike finding)
- `tailoring-plan.ts`: `TailoringPlanSchema`: `items[{profileId, rank, bullets[{text, sourceIds≥1}]}]`,
  `summary[{text, sourceIds≥1}]`, `skills[{name, sourceIds≥1}]`, `headings`, `gaps[]`, `language`
- `errors.ts`: `ErrorCode` union + `CvSnapError` class. Codes: `HOST_NOT_INSTALLED`, `HOST_DISCONNECTED`,
  `CLAUDE_NOT_FOUND`, `CLAUDE_NOT_AUTHENTICATED`, `CLAUDE_VERSION_UNSUPPORTED`, `MODEL_UNAVAILABLE`,
  `PDF_PARSE_FAILED`, `JOB_AD_NOT_DETECTED`, `INVALID_MESSAGE`, `MESSAGE_TOO_LARGE`,
  `GENERATION_TIMEOUT`, `GENERATION_FAILED`, `CANCELLED`; error payload `{ code, message, reason? }`
  (`reason` carries sub-causes such as `NO_TEXT`)
- `models.ts`: `ModelId` (`claude-sonnet-5-5` default, `claude-opus-5-5`, `claude-haiku-5-5`)
- `protocol.ts`: `NativeRequestSchema`, a discriminated union on `type` with `requestId`: `health`,
  `extractPdfText`, `createProfile`, `parseRequirements`, `tailor`, `cancel`; host frames
  `response` (`NativeResponse<T>`) and `progress` (`requestId`, `step`); size-limit constants
  (64 MB inbound, 1 MB outbound); `ProgressStep` union
- `provider.ts`: `CvGenerationProvider` interface (`checkHealth`, `createProfile`,
  `parseRequirements`, `tailor`), each taking `{ model, signal: AbortSignal, onProgress }`;
  `HealthReport` type
- `json-schema.ts`: converts the AI-output schemas to JSON Schema (zod 4 `z.toJSONSchema`) for
  `claude --json-schema` (spike: the most reliable structured-output method)
- Fixtures in `shared/test/fixtures/` (valid + invalid profile, requirements, plan)

### Dependencies

- Bolt 001 spike report: flags, error shapes, nullable-facts rule (done)
- Tooling (latest stable, checked 2026-10-25): pnpm 12.15, Node 26 (engines `>=24`), **TypeScript
  6.0.3 (pinned: typescript-eslint 8.72 supports `<6.1`; TS 7.0 is not supported yet)**, ESLint 10 +
  typescript-eslint 8.72 + eslint-plugin-react-hooks 7, Prettier 3.9, Vitest 5 + coverage-v8,
  WXT 0.21 + @wxt-dev/module-react, React 19.3, zod 4.6, husky 9, lint-staged 17
- Git 2.56 (repo not initialised yet; story asks to initialise it)

### Technical Approach

- **Build**: `pnpm -r build` in topological order: `shared` (`tsc -b`) → `native-host` (`tsc`) and
  `extension` (`wxt build`). Packages reference `shared` as `workspace:*`.
- **Typecheck**: strict + `noUncheckedIndexedAccess` in `tsconfig.base.json`; WXT extends its own
  generated tsconfig plus the same strict flags.
- **Tests**: root Vitest config with `projects` (shared, native-host, extension); coverage threshold
  80% for `shared/` (it holds logic now). Empty packages get one smoke test so `pnpm test` is meaningful.
- **Schemas**: zod 4 is the single source of truth; TS types via `z.infer`. AI-output schemas avoid
  constructs that don't survive JSON Schema conversion (refinements run in zod after parsing).
  Readable errors via `z.prettifyError`.
- **Pre-commit**: husky `pre-commit` → `lint-staged` (eslint --max-warnings 0 + prettier --check on
  staged files).
- **pnpm 12** blocks dependency build scripts by default: approve only what WXT/esbuild need
  (`onlyBuiltDependencies`).
- Out of scope here (owned by later stories): settings and export schemas (UI bolt 012), validator
  result types (story 006), CLI envelope schema and `MIN_CLAUDE_CODE_VERSION` (host bolts 003/004).
  Plan-line IDs for "user-edited" and "unverified" marking are left to story 006.

### Acceptance Criteria

- [ ] `pnpm install && pnpm build` builds all three packages without errors
- [ ] `pnpm lint`, `pnpm format:check`, `pnpm test` pass on the scaffold
- [ ] `pnpm dev` starts WXT and the unpacked extension loads in Chrome with an empty side panel
  (**manual check by the user**)
- [ ] A staged file with lint errors blocks `git commit` via the pre-commit hook
- [ ] `CvProfileSchema`, `JobRequirementsSchema`, `TailoringPlanSchema` parse valid fixtures and
  reject invalid ones with readable errors
- [ ] Duplicate IDs in a profile are rejected; `newId` yields unique IDs; edit helpers never change existing IDs
- [ ] Requests are a discriminated union with `requestId`; replies are `NativeResponse<T>`; an unknown
  message type fails with `INVALID_MESSAGE`
- [ ] `ErrorCode` contains every code named in the requirements, plus the spike additions
- [ ] `CvGenerationProvider` exposes `createProfile`, `parseRequirements`, `tailor`, `checkHealth`
  with progress callback and `AbortSignal`
- [ ] AI-output schemas convert to JSON Schema accepted by `--json-schema` (unit test on the conversion; no CLI call)
