---
id: 001-monorepo-scaffold
unit: 001-cv-tailoring-core
intent: 001-one-click-tailored-cv
status: complete
priority: must
created: '2026-10-25T12:00:00Z'
assigned_bolt: 002-cv-tailoring-core
implemented: true
---

# Story: 001-monorepo-scaffold

## User Story

**As a** developer
**I want** a working pnpm monorepo with extension, native-host and shared packages and all quality tooling
**So that** every later bolt starts from a consistent, lint-clean, testable base

## Acceptance Criteria

- [ ] **Given** a fresh clone, **When** I run `pnpm install && pnpm build`, **Then** all three packages build without errors
- [ ] **Given** the repo, **When** I run `pnpm lint`, `pnpm format:check` and `pnpm test`, **Then** each passes on the empty scaffold
- [ ] **Given** `extension/`, **When** I run `pnpm dev`, **Then** WXT starts and the unpacked extension loads in Chrome with an empty side panel
- [ ] **Given** a staged file with lint errors, **When** I commit, **Then** the pre-commit hook blocks the commit

## Technical Notes

- Follow standards/tech-stack.md and coding-standards.md exactly (ESLint strictTypeChecked, Prettier printWidth 100, Vitest, `noUncheckedIndexedAccess`)
- `shared/src/index.ts` is the only barrel export
- Add `.gitignore`, `README.md` with dev setup, and initialize git

## Dependencies

### Requires
- None (first code story)

### Enables
- 002-domain-schemas-and-contracts

## Edge Cases

| Scenario | Expected Behavior |
|---|---|
| Windows path separators in scripts | Scripts use Node path APIs / cross-platform tools |

## Out of Scope

- Feature code
- CI pipeline (later)
