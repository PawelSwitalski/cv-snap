---
stage: test
bolt: 003-native-host
created: 2026-10-25T19:37:30Z
---

## Test Report: native-host (protocol, install scripts, health check)

### Summary

- **Tests**: 176/176 passed (23 files; 102 new in this bolt), `pnpm test`
- **Coverage**: 96.3% lines, 90.7% branches (shared + native-host; entry points `main.ts` and `install/cli.ts` are excluded from in-process coverage and exercised by the end-to-end tests)
- **Manual Chrome check**: passed (user, 2026-10-25T19:34:42Z; host log: health `t1` ok in 142 ms)

### Test Files

- [x] `native-host/src/protocol/framing.test.ts` - single and batched frames, splits at every byte boundary, byte-by-byte feed, oversized frames skipped across chunks, invalid JSON, UTF-8 length prefix
- [x] `native-host/src/protocol/host.test.ts` - dispatch, validation errors with requestId, unknown and unsupported types, progress before reply, cancel → `CANCELLED` (also when the handler resolves late), duplicate requestId, error mapping, 1 MB outbound guard, > 64 MB inbound, shutdown on stdin end, no payloads in logs; fuzzing with random bytes (30 seeds) and random splits of valid frames (30 seeds)
- [x] `native-host/src/health/find-claude.test.ts` - PATH, `.cmd` shim ignored, WinGet, `~/.local/bin`, npm via Node, not found, non-Windows separator
- [x] `native-host/src/health/check-health.test.ts` - healthy, not found, ENOENT, logged out, old version (warning), unreadable version, parallel probes, no email/org in report; `loggedIn` parsing
- [x] `native-host/src/lib/run-process.test.ts` - output and exit code, stdin, ENOENT, timeout kill, abort kill < 2 s, pre-aborted, output cap, ENAMETOOLONG as a result (Windows)
- [x] `native-host/src/lib/logger-file.test.ts` - file sink, rotation and retention, unwritable directory never throws, tee, app-data paths
- [x] `native-host/src/install/install.test.ts` - wrapper and manifest content, `reg add` arguments, failure reporting, uninstall with and without a key; real HKCU round trip under `com.cvsnap.host.test` with a non-ASCII path (Windows), cleaned up in `finally`
- [x] `native-host/test/e2e.test.ts` - built host as a child process: only frames on stdout, health with Claude hidden, invalid/unsupported/oversized handling, clean exit, file and stderr logging without content; `.cmd` wrapper launched like Chrome from `cv snap Zażółć gęślą`
- [x] `native-host/src/version.test.ts` - host version equals package.json
- [x] `shared/src/health.test.ts` - health issues and severities, version comparison, minimum version
- [x] `shared/src/extension-identity.test.ts` - extension ID derived from the public key, origin
- [x] `extension/src/lib/native-host-client.test.ts` - request/response, progress, host errors, invalid data, ignored frames, cancel, pre-aborted, `HOST_NOT_INSTALLED`, `HOST_DISCONNECTED` + reconnect, extension-side disconnect; Chrome message mapping

### Acceptance Criteria Validation

**Story 002-native-messaging-protocol**
- ✅ **Framed JSON validated with zod and dispatched by `type`; invalid frames get `INVALID_MESSAGE`**
- ✅ **Inbound > 64 MB or outbound ≥ 1 MB → typed error, no crash** (`MESSAGE_TOO_LARGE`; host keeps reading)
- ✅ **Progress frames with the `requestId` before the final reply**
- ✅ **`cancel` aborts the work and a `CANCELLED` reply is sent**
- ✅ **Nothing but protocol frames on stdout** (end-to-end: every stdout byte parsed as a frame, including through the `.cmd` wrapper)
- ✅ Edge cases: partial frames buffered; extension disconnect aborts work and exits with code 0

**Story 003-host-install-scripts**
- ✅ **`pnpm run install-host` writes the manifest and HKCU key without admin rights** (test key round trip; real install by the user)
- ✅ **`allowed_origins` contains only the cv-snap extension ID** (`chrome-extension://mmchmbhcfcoeopinlclfbgaekeocdmnf/`)
- ✅ **Re-running install leaves one correct registration** (identical result, exact registry value read back)
- ✅ **`pnpm run uninstall-host` removes the key and manifest**
- ✅ Edge case: paths with spaces and Polish characters (wrapper launched like Chrome; registry value read back in UTF-8)

**Story 004-health-check**
- ✅ **Host not registered → `HOST_NOT_INSTALLED`** (Chrome's "not found" / "forbidden" messages mapped in the client)
- ✅ **`claude` not on PATH → `CLAUDE_NOT_FOUND`**
- ✅ **Logged out → `CLAUDE_NOT_AUTHENTICATED`**
- ✅ **Older than the tested minimum → warning with update hint, not a failure** (`CLAUDE_VERSION_UNSUPPORTED`, severity `warning`)
- ✅ **Fast (≤ 5 s)**: probes run in parallel; real run 142–150 ms
- ✅ Edge case: per-user installs outside Chrome's PATH found in known locations (WinGet, `~/.local/bin`, npm)

### Issues Found

- **Wrapper UTF-8 switch could fail silently**: a bare `chcp` isn't found when PATH lacks System32, and non-ASCII paths then break. Fixed: `"%SystemRoot%\System32\chcp.com"`.
- **`findClaude` used the host OS path delimiter** instead of the target platform's. Fixed.
- Test-side fixes: absolute `cmd.exe` path in the isolated environment, a log-directory "blocker" file that was never created, 5 lint strictness issues.

### Notes

- No test runs the real `claude` CLI; the end-to-end tests hide it (empty PATH, temp app-data).
- After the tests, `HKCU\…\NativeMessagingHosts` contained only `com.microsoft.browsercore`; the test key was removed.
- At report time the real `com.cvsnap.host` registration was no longer present (removed after the manual check); run `pnpm run install-host` to use the extension with the host again.
