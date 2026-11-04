---
stage: implement
bolt: 027-e2e-tests
created: 2026-11-04T11:40:00Z
---

## Implementation Walkthrough: 004-e2e-tests

### Summary

A second end-to-end test covers the history flow on the bolt 022 harness: download → History,
re-download, sent date across a reload, the saved page, search and filters, retention on reload,
and delete. A small test-only helper reads and writes the history's IndexedDB from the
extension's service worker; the extension itself is unchanged.

### Structure Overview

The test drives the real side panel by role and English text, as the one-click test does. The
helper is used only where the UI can't do the job: to read exact timestamps, to add a second entry
with a different company and title (the fake provider always returns the same job), and to move an
entry into the past for retention.

### Completed Work

- [x] `e2e/harness/history.ts` - test-only access to the history databases in the extension's layout: list entries, add an entry with its files, backdate an entry; refuses to create databases the extension hasn't
- [x] `e2e/tests/history.spec.ts` - one test in five steps, one per acceptance criterion
- [x] `e2e/fixtures/pages/job-ad.html` - an inline marker script that does nothing on the job board and would add a marker in any saved copy that ran it

### Key Decisions

- **One test in steps** rather than five tests: each step needs the history the previous one left, and a fresh browser per step adds several seconds each.
- **Raw IndexedDB in the service worker** instead of a test-only hook in the extension: the extension ships no test code, and the helper checks the same storage the panel reads.
- **The marker script is guarded by the host name**, so the live page and the one-click test are unaffected and only a saved copy could show the marker.
- **The second download is checked by polling** storage: the entry is written just after Chrome starts the download.

### Deviations from Plan

- The first entry's row is named **"jobs.cvsnap.test"**, not "Przykładowa Firma": the fake provider's requirements have no company, so the list falls back to the ad's site, as designed. The test asserts that fallback; the fixture is unchanged.
- The header's History button is located by its exact name, because the "Show in history" hint is also shown after the first download.

### Dependencies Added

None.

### Developer Notes

- The helper writes the fields the extension validates; if the history entry schema changes, `seedHistoryEntry` must follow or the panel will count the seeded entry as unreadable.
- `pnpm --filter @cv-snap/e2e test` reruns the browser tests without rebuilding when only `e2e/` changed.
