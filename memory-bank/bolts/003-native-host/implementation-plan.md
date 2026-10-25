---
stage: plan
bolt: 003-native-host
created: 2026-10-25T18:47:19Z
---

## Implementation Plan: native-host (protocol, install scripts, health check)

### Objective

A registered, robust native host the extension can connect to: length-prefixed JSON over stdio with
validation, size limits, progress and cancel; one-command install/uninstall on Windows (HKCU, no
admin); and a fast health check that tells the user exactly what is missing (host, Claude Code,
login, version), using the detection methods verified in spike 001.

### Deliverables

**Story 002: native-messaging protocol** (`native-host/src/protocol/`)
- `framing.ts`: incremental decoder (4-byte little-endian length + UTF-8 JSON) that buffers
  partial frames across chunks, and an encoder. A declared length above 64 MB → `MESSAGE_TOO_LARGE`
  reply, the declared bytes are discarded and decoding continues (no crash, no lost framing).
  Unparseable JSON → `INVALID_MESSAGE`
- `host.ts`: `runHost({ input, output, handlers, logger })` with the streams injected, so it can be
  tested in-process. Validates each frame (`parseNativeRequest`), dispatches by `type`, one
  `AbortController` per `requestId`, `cancel` → abort → `CANCELLED` reply, progress frames before
  the final reply. Every reply goes through one `send()` that checks size: an outbound frame of
  1 MB or more is replaced by a `MESSAGE_TOO_LARGE` error reply. Top-level try/catch maps everything
  to `{ ok: false }` (`toErrorPayload`). When stdin ends (extension disconnected), all work is
  aborted and the host exits cleanly
- Request types without a handler yet (`extractPdfText`, `createProfile`, `parseRequirements`,
  `tailor`, which arrive in bolt 004) reply with a typed "not supported by this host version" error
- `main.ts`: wires `process.stdin`/`process.stdout`; logs only to stderr and the rotating file
- `lib/logger.ts`: adds a rotating file sink (`%LOCALAPPDATA%\cv-snap\logs\host.log`, 5 × 1 MB)

**Story 003: install scripts** (`native-host/src/install/`, root scripts `install-host` and `uninstall-host`)
- Fixed development extension ID: generate an RSA key pair once and put the **public** key in the
  manifest `key` (via `wxt.config.ts`). The extension ID is derived from it (SHA-256 → a–p),
  exported from `shared` as `EXTENSION_ID`, and a unit test checks the derivation. The private key
  is not kept (it is only needed for packing; the Chrome Web Store assigns its own key later)
- `install.ts`: writes `%LOCALAPPDATA%\cv-snap\host\cv-snap-host.cmd` (calls the absolute
  `node.exe` path with the absolute path of the built `dist/main.js`, so Chrome's PATH doesn't
  matter), writes `com.cvsnap.host.json` (`type: "stdio"`, `allowed_origins` = only
  `chrome-extension://<EXTENSION_ID>/`), and sets
  `HKCU\Software\Google\Chrome\NativeMessagingHosts\com.cvsnap.host` (default value = manifest
  path) via `reg.exe` with argument arrays (no shell). Idempotent: files are overwritten and the
  key uses `/f`
- `uninstall.ts`: deletes the key and the host directory; succeeds when already absent
- Paths with spaces and Polish characters: the wrapper switches to UTF-8 (`chcp 65001`) and quotes
  every path; tested with a temp directory such as `C:\…\Temp\cv snap Zażółć\`

**Story 004: health check** (`native-host/src/health/`, `shared`, `extension/src/lib/`)
- `find-claude.ts`: search PATH (with PATHEXT) first, then known install locations: WinGet
  (`%LOCALAPPDATA%\Microsoft\WinGet\Packages\Anthropic.ClaudeCode_*\claude.exe`, your setup),
  `%USERPROFILE%\.local\bin\claude.exe`, and npm (`%APPDATA%\npm\node_modules\@anthropic-ai\claude-code\cli.js`,
  run via `node`, because a `.cmd` can't be spawned without a shell)
- `check-health.ts`: `claude --version` and `claude auth status --json` run **in parallel**, each
  with a timeout (no model call, about 0.2 s each in the spike); parses only `loggedIn` (never logs
  the email or org); compares against `MIN_CLAUDE_CODE_VERSION = "2.1.302"`
- `lib/run-process.ts`: spawn without a shell, args array, timeout and kill, stdout capped. It is
  reused by the provider in bolt 004
- `shared/src/health.ts`: `getHealthIssues(report)` → `[{ code, severity }]`
  (`CLAUDE_NOT_FOUND` / `CLAUDE_NOT_AUTHENTICATED` = error, `CLAUDE_VERSION_UNSUPPORTED` = warning)
- `extension/src/lib/native-host-client.ts`: minimal port client (`connectNative`, requests by
  `requestId`, progress callback, cancel via `AbortSignal`, response validation). Maps Chrome's
  "Specified native messaging host not found." to `HOST_NOT_INSTALLED` and other disconnects to
  `HOST_DISCONNECTED`. The UI that shows results is story 005-tailored-cv-ui/002

### Dependencies

- Bolt 002 contracts (`parseNativeRequest`, frames, size limits, `ErrorCode`)
- Spike 001: `--version` / `auth status --json` shapes, ENOENT → `CLAUDE_NOT_FOUND`, minimum version
- Windows `reg.exe` (built in); Node built-ins only, with no new runtime dependencies
- `@types/chrome` is not needed: WXT provides typed `browser.runtime.connectNative`

### Technical Approach

- Everything I/O-related is injected (streams, process runner, file system roots, registry runner),
  so unit tests run in-process with fakes and **never call the real `claude`** (coding standards)
- **End-to-end tests against the built host**: a Vitest global setup builds `shared` and
  `native-host` (about 3 s), then tests spawn `node dist/main.js` (and the generated `.cmd` wrapper
  through `cmd.exe /d /s /c`), send real frames and assert that **every stdout byte belongs to a
  valid frame**
- Fuzz test: random bytes, truncated frames, oversized length headers, and valid frames split at
  every byte boundary. The host must never crash and must answer each complete valid frame
- **Registry tests write a separate key** (`com.cvsnap.host.test`) under HKCU and delete it
  afterwards, so the real registration is never touched by tests
- Manual check after Stage 3 (optional, about 1 min): `pnpm run install-host`, reload the extension,
  then in the service-worker console run
  `await browser.runtime.sendNativeMessage("com.cvsnap.host", { type: "health", requestId: "t1" })`

### Acceptance Criteria

- [ ] Valid frames are validated and dispatched by `type`; invalid frames → `INVALID_MESSAGE`
- [ ] Inbound > 64 MB and outbound ≥ 1 MB → typed `MESSAGE_TOO_LARGE`, no crash
- [ ] Progress frames with the `requestId` arrive before the final reply
- [ ] `cancel` aborts the running request, which replies `CANCELLED`
- [ ] Only protocol frames are ever written to stdout (end-to-end test on the built host)
- [ ] Partial frames are buffered; a closed stdin aborts work and the host exits cleanly
- [ ] `pnpm run install-host` writes the manifest and HKCU key without admin rights;
  `allowed_origins` = only the cv-snap ID; re-running leaves one correct registration;
  `pnpm run uninstall-host` removes both
- [ ] Paths with spaces and Polish characters work (wrapper tested end to end)
- [ ] Health reports `HOST_NOT_INSTALLED` (extension side), `CLAUDE_NOT_FOUND`,
  `CLAUDE_NOT_AUTHENTICATED`, and a version warning (not a failure); the check takes ≤ 5 s
- [ ] Claude installed outside Chrome's PATH is found in known locations
