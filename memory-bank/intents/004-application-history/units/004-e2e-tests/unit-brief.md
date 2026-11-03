---
unit: 004-e2e-tests
intent: 004-application-history
phase: inception
status: in-progress
unit_type: integration
default_bolt_type: simple-construction-bolt
created: '2026-11-03T15:28:00Z'
updated: '2026-11-03T15:28:00Z'
---

# Unit Brief: 004-e2e-tests

## Purpose

Fake AI provider in the host, Playwright harness that loads the dev build and registers the real host for the test browser only, the one-click and history E2E tests, and the CI job.

---

## Assigned Requirements

| FR | Requirement | Priority |
|---|---|---|
| FR-9 | Playwright E2E: one-click flow | Must |
| FR-10 | Playwright E2E: history flow | Must |
| FR-11 | E2E in CI and locally | Must |

---

## Story Summary

- **Total Stories**: 5
- **Must Have**: 5
- **Should Have**: 0
- **Could Have**: 0

### Stories

- [x] **001-fake-ai-provider**: Fake AI provider in the host - Must - Complete
- [x] **002-e2e-harness**: Playwright harness: extension + real host - Must - Complete
- [x] **003-one-click-e2e**: E2E: one-click flow - Must - Complete
- [x] **004-e2e-ci-job**: E2E job in CI - Must - Complete
- [ ] **005-history-e2e**: E2E: history flow - Must - Planned

---

## Dependencies

- **Depends on**: None for stories 001–004; 005-history-e2e depends on 001-history-core and 002-history-ui
- **Depended by**: Operations (0.2.0)

---

## Success Criteria

- [ ] All acceptance criteria met
- [ ] Tests passing (`pnpm test`; `pnpm test:e2e` where E2E applies)
- [ ] Code reviewed and approved

---

## Bolt Suggestions

- **022-e2e-tests**: 001-fake-ai-provider, 002-e2e-harness, 003-one-click-e2e, 004-e2e-ci-job (first: highest uncertainty)
- **027-e2e-tests**: 005-history-e2e (after the history units)
