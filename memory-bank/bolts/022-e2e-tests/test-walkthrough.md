---
stage: test
bolt: 022-e2e-tests
created: 2026-11-03T15:54:00Z
---

## Test Report: 004-e2e-tests (bolt 022)

### Summary

- **Tests**: 1176/1177 passed, 1 skipped (as before: the shell-launcher test that runs only off Windows); 14 new
- **E2E**: `pnpm test:e2e` 1/1 passed; `--repeat-each=10` 10/10 passed (about 2.2 s each), no retries
- **Coverage**: thresholds unchanged (shared + native-host ≥ 80 %); `host-main.ts` stays excluded as an entry point and is covered by the host e2e tests
- Typecheck, lint, `format:check`, `pnpm build` and `zip:release` green

### Test Files

- [x] `native-host/src/providers/fake-provider.test.ts` - Fixture answers with progress in order, healthy report, invalid fixture → `GENERATION_FAILED`, aborted → `CANCELLED`, env selection (5)
- [x] `native-host/test/e2e.test.ts` - Built host over stdio: the fake provider answers only when the env var is set; message fields can't select it (+2)
- [x] `extension/src/build/manifest.test.ts` - `e2e` manifest = production manifest + only the fixture host permission (+1)
- [x] `extension/src/lib/native-host-client.test.ts` - e2e build → `com.cvsnap.host_e2e`; development, production and release → `com.cvsnap.host` (+1)
- [x] `e2e/harness/host-registration.test.ts` - e2e host name only, environment inside the work dir, `.cmd` and shell launchers (quoting), and on Windows: registry key written and restored, idempotent `remove()` (5)
- [x] `e2e/tests/one-click.spec.ts` - Playwright: job ad → side panel → Generate → progress steps → preview → Download PDF (`CV_….pdf`, `%PDF-`)

### Acceptance Criteria Validation

- ✅ **`CV_SNAP_FAKE_PROVIDER` set → fixture answers with normal progress; unset → `ClaudeCodeProvider`**: unit and host e2e tests
- ✅ **No extension message can switch the provider**: host e2e test with provider fields in `health` and `createProfile`
- ✅ **`--mode e2e` manifest: dev key, fixture host permission, e2e host name; dev and release unchanged**: manifest and client tests; release zip checked (no `key`, no `host_permissions`)
- ✅ **`pnpm test:e2e` on Windows passes; no e2e registry key left; `com.cvsnap.host` untouched**: checked with `reg query` after 11 runs; no `cvsnap-e2e-*` temp folders left
- ✅ **One-click test asserts progress, preview and the `%PDF` download with the expected file name**
- ⏳ **CI `e2e` job green on Ubuntu, report/trace uploaded on failure**: the job is written, but it runs only after a push. It is the first run of the Linux registration (`<user-data-dir>/NativeMessagingHosts`), which can't be run locally (no Linux environment on this PC).
- ✅ **`pnpm test`, typecheck, lint, format:check green**
- ✅ **Side-panel approach recorded**: A (implementation walkthrough)

### Issues Found

- Playwright writes `e2e/test-results/.last-run.json`, which failed `format:check`; Playwright output was added to `.prettierignore` (it was already in `e2e/.gitignore`).
- Pre-existing, outside this bolt: the store build contains dev-only code (`import.meta.env.DEV` is true for the `release` mode). See the implementation walkthrough, Developer Notes.

### Notes

- The CI result should be confirmed after the push, before this unit's second bolt (027) builds on the harness. If the Linux registration path is wrong, the fix is limited to `registerHost`.
- The "10 consecutive green CI runs" rule (story 004) is checked at the 0.2.0 release, not in this bolt.
