# Tech Stack

## Overview

Core technology decisions for this project.

cv-snap is a Chrome extension (Manifest V3) that tailors the user's CV to the job advertisement open in the current tab. It is written entirely in TypeScript: a WXT + React extension talks over Chrome native messaging to a local Node.js host, which runs the user's Claude Code install to generate the CV.

## Languages

**TypeScript** (strict) everywhere: extension, native messaging host, and shared packages.

Using one language lets us define the native-messaging protocol, the CV data schema, and the provider interface once in `shared/`, with both sides of the native-messaging connection type-checked against it. Type safety matters here because the extension and host are separate processes that communicate only by serialized messages.

## Framework

- **Extension:** [WXT](https://wxt.dev) (Manifest V3) with **React** for UI.
  - WXT provides file-based entry points (popup/side panel, background service worker, content scripts), manifest generation, and hot reload. It works with any UI library and leaves cross-browser builds open.
  - React suits the stateful UI flow (upload template → generate → preview → edit → download) and, later, rendering structured CV data as components.
- **Native host:** **Node.js** (TypeScript) program speaking the Chrome native messaging protocol (length-prefixed JSON over stdio).

### AI Integration

Generation is abstracted behind a **`CvGenerationProvider`** interface, defined in `shared/`.

- **v1: `ClaudeCodeProvider`**: extension → native messaging → Node host → `claude -p` (headless Claude Code) using the user's local install and subscription.
- **Later:** a direct Anthropic API provider for users without Claude Code.

The extension depends only on the interface, never on a concrete provider.

## Authentication

**None.** Everything runs locally; Claude Code uses the user's own existing login. No API keys or credentials are stored in the extension. If a direct-API provider is added later, key storage will be revisited.

## Infrastructure & Deployment

- **Now (development / early testers):** load the extension unpacked in Chrome developer mode; `pnpm run install-host` builds the native host and registers its native-messaging manifest with Chrome (Windows: registry key under `HKCU\Software\Google\Chrome\NativeMessagingHosts`; macOS/Linux: manifest JSON in the browser's `NativeMessagingHosts` directory).
- **Public release:** extension via the **Chrome Web Store**; native host published to **npm** and installed with `npx cv-snap-host install`.

No server-side infrastructure: all processing is on the user's machine.

## Package Manager

**pnpm** with workspaces:

```
cv-snap/
├── extension/     # WXT + React Chrome extension
├── native-host/   # Node.js native messaging host (Claude Code bridge)
└── shared/        # Protocol messages, CV schema, provider interface
```

## Decision Relationships

- **Node.js host ↔ Claude Code users:** the host needs Node, which Claude Code users usually already have.
- **Node.js host ↔ npm distribution:** `npx cv-snap-host install` is only possible because the host is a Node package.
- **TypeScript everywhere ↔ `shared/` package:** one definition of messages and CV schema across the native-messaging connection.
- **Provider interface ↔ future direct-API mode:** keeps the extension independent of how generation happens.
- **Local-only processing ↔ no auth:** the CV and job ad never pass through cv-snap servers (there are none); they go only to Claude via the user's own Claude Code.
