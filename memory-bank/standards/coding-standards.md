# Coding Standards

## Overview

Code style and quality standards for this project.

Strict TypeScript with automated formatting and linting, feature-based structure, Vitest-based testing that mocks Claude at the provider boundary, typed errors carried across the native-messaging connection as result objects, and privacy-first logging that never records CV or job-ad content.

## Code Formatting

**Tool**: Prettier
**Key Settings**:
- Prettier defaults (2-space indent, double quotes, semicolons, trailing commas "all")
- `printWidth`: 100

**Enforcement**: format on save in the editor + pre-commit hook (lint-staged); CI runs `prettier --check`.

## Linting

**Tool**: ESLint (flat config)
**Base Config**: `typescript-eslint` `strictTypeChecked` + `eslint-plugin-react-hooks`
**Strictness**: strict

**TypeScript compiler**: `strict: true`, `noUncheckedIndexedAccess: true`.

**Key Rules**:
- `@typescript-eslint/no-explicit-any`: error, so use `unknown` and narrow it. Messages arriving over native messaging are untrusted input.
- `no-console`: error everywhere except the logger module, because in the native host stdout is the protocol channel and a stray `console.log` corrupts it.
- `react-hooks/rules-of-hooks` / `exhaustive-deps`: error.
- `@typescript-eslint/no-floating-promises`: error, so a native message is never sent without handling the result.
- No commented-out code; no `TODO` without a reference (story ID or issue).

## Naming Conventions

| Element | Convention | Example |
|---------|------------|---------|
| Variables | camelCase | `jobAd`, `cvTemplate` |
| Functions | camelCase | `extractJobRequirements`, `sendNativeMessage` |
| Classes | PascalCase | `ClaudeCodeProvider`, `CvSnapError` |
| Interfaces / Types | PascalCase, **no `I` prefix** | `CvGenerationProvider`, `JobAd` |
| Constants | UPPER_SNAKE | `NATIVE_HOST_NAME`, `GENERATION_TIMEOUT_MS` |
| Error codes | UPPER_SNAKE string literals | `"CLAUDE_NOT_FOUND"` |
| Booleans | `is` / `has` / `can` prefix | `isGenerating`, `hasTemplate` |
| Event props / handlers | `onX` / `handleX` | `onGenerate` / `handleGenerate` |
| React components | PascalCase | `GenerateButton` |
| React hooks | camelCase with `use` | `useCvTemplate` |

**File Naming**:
- Components: `PascalCase.tsx` (e.g. `GenerateButton.tsx`)
- Everything else: `kebab-case.ts` (e.g. `native-messaging.ts`)
- Tests: `<file>.test.ts` / `<Component>.test.tsx`

## File Organization

**Pattern**: feature-based (extension), module-based (native host), shared contracts package.

**Structure**:
```text
cv-snap/
├── extension/                 # WXT + React
│   └── src/
│       ├── entrypoints/       # WXT entry points (popup/sidepanel, background, content scripts)
│       ├── features/
│       │   ├── cv-template/   # template upload & storage
│       │   ├── job-ad/        # job ad extraction from the page
│       │   └── generate/      # generation flow, preview, download
│       └── lib/               # cross-feature utilities (logger, native messaging client)
├── native-host/
│   └── src/
│       ├── protocol/          # native messaging framing (stdio, length-prefixed JSON)
│       ├── providers/         # ClaudeCodeProvider (runs `claude -p`)
│       ├── pdf/               # PDF parsing / generation
│       └── lib/               # logger, errors
└── shared/
    └── src/                   # message types, CV schema, provider interface, error codes
        └── index.ts           # the only barrel export in the repo
```

**Conventions**:
- Tests: co-located next to source as `*.test.ts(x)`; fixtures in `<package>/test/fixtures/`.
- Types: co-located with the code that owns them; anything crossing the native-messaging connection lives in `shared/`.
- Index files: only `shared/src/index.ts`; elsewhere import from the file directly.

## Testing Strategy

**Framework**: Vitest
**Coverage Target**: ~80% for `shared/` and `native-host/`; the most important user flows covered in `extension/`.

**Test Types**:

| Type | Tool | When to Use |
|------|------|-------------|
| Unit | Vitest | Pure logic: parsing, prompt building, schema validation, protocol framing |
| Component | Vitest + Testing Library | React UI behavior (user-visible, not implementation details) |
| Integration | Vitest | Native host end-to-end over stdio with a fake provider |
| Fixture regression | Vitest | Real job ads + CVs in `test/fixtures/`, checking that generated output contains no claims absent from the source CV (anti-hallucination) |
| E2E | Playwright | *Later*: load the unpacked extension and run the one-click flow |

**Conventions**:
- Test naming: `describe("<unit>")` + `it("<does X> when <Y>")`.
- Test structure: Arrange-Act-Assert.
- Mock strategy: mock at boundaries only. Claude is replaced by a fake `CvGenerationProvider`; tests **never** run the real `claude` CLI. Chrome APIs are faked at the native-messaging client.
- No snapshot tests for generated CV text; assert on structure and specific claims instead.

## Error Handling

**Pattern**: throw within a process; return result objects across the native-messaging connection.

**Across the native-messaging connection** (defined in `shared/`):
```typescript
type NativeResponse<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: ErrorCode; message: string } };
```

**Custom Errors**: `CvSnapError extends Error` with a typed `code: ErrorCode`, for example:
`HOST_NOT_INSTALLED`, `CLAUDE_NOT_FOUND`, `CLAUDE_NOT_AUTHENTICATED`, `PDF_PARSE_FAILED`, `JOB_AD_NOT_DETECTED`, `GENERATION_TIMEOUT`, `GENERATION_FAILED`, `INVALID_MESSAGE`.

**Rules**:
- The native host catches everything at the top of the message handler and converts it to `{ ok: false }`; it never crashes on a bad message.
- Every `ErrorCode` maps to a user-facing message (with a fix hint where possible, e.g. "Run `pnpm run install-host`").
- A React error boundary wraps the extension UI.
- Validate all incoming messages against the `shared/` schema before use.

## Logging

**Tool**: small logger wrapper per package (`lib/logger.ts`); no direct `console.*` elsewhere.
**Format**: structured (JSON lines) in the native host; plain console output in the extension (dev only).

**Levels**:

| Level | Usage |
|-------|-------|
| error | Operation failed (with error code) |
| warn | Unexpected but handled (e.g. retry, fallback) |
| info | Lifecycle events: host started, generation started/finished (with duration) |
| debug | Detailed technical info, off by default |

**Rules**:
- **Native host never writes to stdout**, because stdout is the Chrome native messaging channel. Logs go to stderr and a rotating log file in the user's app-data directory.
- Always log: error codes, durations, message types, payload sizes, request IDs.
- **Never log**: CV contents, job ad text, generated CV text, personal data (names, emails, phone numbers), file paths that reveal the user's identity, or credentials.
