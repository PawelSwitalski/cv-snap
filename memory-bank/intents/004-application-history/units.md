---
intent: 004-application-history
phase: inception
status: complete
updated: 2026-11-03T15:40:00Z
---

# Application History - Unit Decomposition

## Units Overview

Four units: the history data and its capture (extension domain), the user-facing views, the
backup, and the end-to-end tests. The E2E harness is built first: it carries the most uncertainty
(native host under Playwright) and protects the flow the history work changes.

### Unit 1: 001-history-core

**Description**: History entry model and IndexedDB store, saving on Download PDF (one entry per
`AdKey`), the cleaned job-ad page snapshot, and opening a saved PDF or page safely.

**Assigned Requirements**: FR-1, FR-2

**Stories**: 001-history-store, 002-save-on-download, 003-page-snapshot, 004-open-saved-files

**Dependencies**: Depends on None · Depended by 002-history-ui, 003-history-backup, 004-e2e-tests (history flow)

**Default bolt type**: simple-construction-bolt · **Estimated Complexity**: M

### Unit 2: 002-history-ui

**Description**: The History tab (list, search, filter, actions), mark as sent, the
already-in-history hint, the retention setting with pruning, and the privacy notice/policy update.

**Assigned Requirements**: FR-3, FR-4, FR-5, FR-6, FR-8

**Stories**: 001-history-tab, 002-mark-as-sent, 003-already-in-history-hint, 004-retention-setting, 005-privacy-notice-v2

**Dependencies**: Depends on 001-history-core · Depended by 003-history-backup (retention after import), 004-e2e-tests (history flow)

**Default bolt type**: simple-construction-bolt · **Estimated Complexity**: M

### Unit 3: 003-history-backup

**Description**: Export includes history; import restores and merges it by `AdKey`; 0.1.x
profile-only backups still import.

**Assigned Requirements**: FR-7

**Stories**: 001-export-with-history, 002-import-merges-history

**Dependencies**: Depends on 001-history-core, 002-history-ui (retention) · Depended by Operations (0.2.0)

**Default bolt type**: simple-construction-bolt · **Estimated Complexity**: M

### Unit 4: 004-e2e-tests

**Description**: Fake AI provider in the host, Playwright harness that loads the dev build and
registers the real host for the test browser only, the one-click and history E2E tests, and the
CI job.

**Assigned Requirements**: FR-9, FR-10, FR-11

**Stories**: 001-fake-ai-provider, 002-e2e-harness, 003-one-click-e2e, 004-e2e-ci-job, 005-history-e2e

**Dependencies**: Depends on None for stories 001–004; 005-history-e2e depends on 001-history-core and 002-history-ui · Depended by Operations (0.2.0)

**Default bolt type**: simple-construction-bolt · **Estimated Complexity**: L (uncertainty in the harness)

## Requirement-to-Unit Mapping

- **FR-1**: Download saves the CV to history → `001-history-core`
- **FR-2**: Cleaned snapshot of the job-ad page → `001-history-core`
- **FR-3**: History tab → `002-history-ui`
- **FR-4**: Mark as sent → `002-history-ui`
- **FR-5**: Already-in-history hint → `002-history-ui`
- **FR-6**: Retention setting → `002-history-ui`
- **FR-7**: History in the backup → `003-history-backup`
- **FR-8**: Privacy notice and policy updated → `002-history-ui`
- **FR-9**: Playwright E2E: one-click flow → `004-e2e-tests`
- **FR-10**: Playwright E2E: history flow → `004-e2e-tests`
- **FR-11**: E2E in CI and locally → `004-e2e-tests`
