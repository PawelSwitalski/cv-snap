---
stage: implement
bolt: 003-native-host
created: 2026-10-25T18:58:32Z
---

## Implementation Walkthrough: native-host (protocol, install scripts, health check)

### Summary

The native host now speaks Chrome's length-prefixed JSON protocol with validation, size limits,
progress, cancel and clean shutdown. It is registered for the current user with one command
(`pnpm run install-host`) and removed with another, and it answers a health request that reports
whether Claude Code is installed, logged in and new enough, without a model call. The extension has
a typed port client that turns Chrome's connection errors into `HOST_NOT_INSTALLED` or
`HOST_DISCONNECTED`. A smoke run of the built host against the real CLI returned a correct health
report, and every stdout byte was a valid frame.

### Structure Overview

The host is split into protocol (framing + dispatch loop with injected streams), health (CLI
discovery + probes), install (wrapper, manifest, registry) and lib (logger, paths, process runner).
`main.ts` only wires real stdio, the logger and the handlers. Shared gained the extension identity
and health helpers; the extension gained the port client. AI and PDF request types are accepted by
the protocol but answered "not supported by this host version" until bolt 004 registers handlers.

### Completed Work

- [x] `native-host/src/protocol/framing.ts` - incremental frame decoder (partial frames, oversized frames skipped without losing sync, invalid JSON) and encoder
- [x] `native-host/src/protocol/host.ts` - host loop: validation, dispatch by type, per-request abort, cancel → `CANCELLED`, progress frames, outbound 1 MB guard, top-level error mapping, shutdown on stdin end
- [x] `native-host/src/main.ts` - wires stdio, logger and the health handler; redirects any console output away from stdout; logs uncaught errors
- [x] `native-host/src/lib/logger.ts` - stderr sink plus rotating file sink (5 × 1 MB in `%LOCALAPPDATA%\cv-snap\logs`); logging never throws
- [x] `native-host/src/lib/paths.ts` - per-user app-data, log and install directories
- [x] `native-host/src/lib/run-process.ts` - spawn without shell, timeout, abort, output cap, force-kill of the process tree; reused by the provider in bolt 004
- [x] `native-host/src/health/find-claude.ts` - CLI discovery: PATH, WinGet packages, `~/.local/bin`, npm `cli.js` via Node
- [x] `native-host/src/health/check-health.ts` - parallel `--version` and `auth status --json` probes; reads only `loggedIn`; version check against the minimum
- [x] `native-host/src/version.ts` - host version reported in the health check
- [x] `native-host/src/install/install.ts` - wrapper (UTF-8, quoted paths), manifest (only the cv-snap origin), HKCU registration and removal, idempotent
- [x] `native-host/src/install/cli.ts` - `install` / `uninstall` commands behind the root scripts
- [x] `package.json` - root scripts `install-host` and `uninstall-host` (build first, then register)
- [x] `shared/src/extension-identity.ts` - public key, derived extension ID and origin
- [x] `shared/src/health.ts` - minimum Claude Code version, version comparison, health report → issues with severity
- [x] `extension/wxt.config.ts` - manifest `key` for the fixed extension ID
- [x] `extension/src/lib/native-host-client.ts` - port client: requests by ID, progress, cancel, reply validation, disconnect → error code, reconnect

### Key Decisions

- **Injected streams and runners**: the host loop, health check and installer are tested in-process with fakes; no unit test calls the real `claude`.
- **Oversized inbound frames are skipped, not fatal**: the host reports `MESSAGE_TOO_LARGE` and keeps reading the following frames.
- **Cancel rejects locally at once in the extension**: the UI is not kept waiting; the host's `CANCELLED` reply for that ID is ignored.
- **Console redirected in `main.ts`**: libraries added later (e.g. pdf.js) can't corrupt stdout; only a part count is logged, never content.
- **Health reads only `loggedIn`**: `auth status` also prints email and org, which are never logged or returned.
- **Version mismatch is a warning**: `getHealthIssues` marks `CLAUDE_VERSION_UNSUPPORTED` as a warning, not a blocker (story 004).

### Deviations from Plan

- Requests that reuse an ID of a running request are rejected with `INVALID_MESSAGE` (not in the plan; prevents cancel ambiguity).
- `HOST_NOT_INSTALLED` also covers Chrome's "access forbidden" message, which means the manifest exists but doesn't allow this extension ID.

### Dependencies Added

None (Node built-ins and `reg.exe` only).

### Developer Notes

- Extension ID for development: `mmchmbhcfcoeopinlclfbgaekeocdmnf`. Changing `EXTENSION_PUBLIC_KEY` changes the ID; re-run `pnpm run install-host` afterwards.
- After `install-host`, reload the extension in `chrome://extensions`; Chrome reads the registry when a port is opened.
- The wrapper points at this repository's `native-host/dist/main.js`; rebuild the host after code changes (no re-registration needed).
