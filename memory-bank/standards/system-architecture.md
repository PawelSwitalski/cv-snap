# System Architecture

## Overview

High-level architectural decisions and patterns.

cv-snap is a local-only system with two processes: a **WXT/React Chrome extension** that owns all user data and the UI, and a **stateless Node.js native messaging host** that runs headless Claude Code. A CV is never rewritten as free text. It is converted once into a user-reviewed **structured CV profile**, and each generation produces a **tailoring plan whose every line cites profile items**, which deterministic code validates before it is rendered.

## Architecture Style

- **Extension:** a pipeline of small, independently testable steps:

  ```text
  extractJobAd → parseRequirements → tailor → validate → (retry once) → render
  ```

- **Native host:** ports and adapters. `CvGenerationProvider` (in `shared/`) is the port; `ClaudeCodeProvider` is the v1 adapter. A direct Anthropic API adapter may be added later without changing the extension.

```text
┌──────────────── Chrome extension (owns data + UI) ────────────────┐
│ side panel UI ─ Zustand stores ─ chrome.storage.local / IndexedDB │
│ content script (allowed sites only) → job ad text                 │
│ background worker ── connectNative port ──┐                       │
└───────────────────────────────────────────┼───────────────────────┘
                                            ▼  stdio, length-prefixed JSON
┌──────────── Native host (stateless) ──────────────────────────────┐
│ protocol → zod validation → pipeline step → CvGenerationProvider  │
│                                   └─ ClaudeCodeProvider → claude -p│
└───────────────────────────────────────────────────────────────────┘
```

## CV Processing Pipeline

1. **Profile creation (once per CV template)**
   - The extension sends the uploaded PDF to the host (extension → host messages may be up to 64 MB).
   - The host extracts the text with `pdfjs-dist`.
   - Claude converts the text into a **structured CV profile** (JSON): experience, projects, skills, education, languages, certifications, contact. Every item and bullet gets a stable `id`.
   - **The user reviews and corrects the profile** in the UI. From then on, the reviewed profile is the **only source of facts**.
2. **Job requirements**: Claude converts the extracted ad text into structured requirements: title, company, must-haves, nice-to-haves, keywords, language.
3. **Tailoring**: Claude receives the profile and the requirements, and returns a **tailoring plan**: selected items, their order, rephrased bullets, a summary, and a **gaps list**. Every output line carries `sourceIds` pointing to profile items.
4. **Validation** (see Anti-Hallucination).
5. **Rendering**: the **extension** renders the plan with `@react-pdf/renderer`. CV templates are React components, and other output formats (DOCX, Markdown, LinkedIn text) are additional renderers over the same profile and plan.

**Trade-off accepted:** output uses cv-snap templates, not the original PDF's visual design. Templates that imitate common CV designs can be added later.

## Anti-Hallucination

**Default (always on):**
- Claude output must match a strict schema (zod), and invalid JSON is rejected.
- Every output bullet or claim cites `sourceIds` from the profile.
- A **deterministic validator** (plain code, no LLM) rejects:
  - unknown or missing `sourceIds`
  - skills or technologies not present in the profile
  - numbers, dates, percentages, company names and job titles that do not appear in the cited source items
- On failure: **retry once** with the validator errors attached. Lines that still fail are shown in the preview marked **unverified**, so the user decides.
- Job requirements the user doesn't meet go into a **gaps list** shown to the user and are **never** written into the CV.

**Later (optional setting): "Strict mode"**: an additional Claude verification pass that checks each rephrased bullet is supported by its sources, to catch exaggeration such as "assisted with" becoming "led". Costs roughly twice the time and usage per generation.

## Job Ad Extraction

- Runs only on **user-allowed sites** (see Security Patterns).
- A content script takes the main readable text with **Mozilla Readability**, and then the requirements step parses it.
- Parsed requirements are shown next to the preview so the user sees what the CV was matched against.
- **Fallback:** if no ad is detected (`JOB_AD_NOT_DETECTED`), the user selects the ad text manually and generates from the selection.
- Site-specific adapters are a possible later enhancement, not part of v1.

## API Design (Native Messaging Protocol)

- A **long-lived port** (`chrome.runtime.connectNative`) for generation, because a run takes roughly 20–60 s.
  - Host → extension **progress events** (e.g. `reading-job-ad`, `tailoring`, `validating`).
  - Extension → host **cancel**, which kills the `claude` child process.
- Every message is a typed discriminated union from `shared/`, carrying a `requestId`.
- Replies use `NativeResponse<T>` (`{ ok: true, data } | { ok: false, error: { code, message } }`) as defined in coding standards.
- **Chrome limits host → extension messages to 1 MB**, so the host returns only JSON (profile, requirements, plan) and **never PDFs or other binaries**.

## State Management

- **Persistent data lives entirely in the extension, on the user's PC:**
  - `chrome.storage.local` (with `unlimitedStorage`): CV profile, settings, allowed-sites list, requirements cache.
  - IndexedDB: original PDF, generated CV files/history.
  - Not synced (Chrome Sync does not apply to `storage.local`); separate per Chrome profile; deleted when the extension is uninstalled.
- **Native host is stateless.** It processes one request and keeps nothing. Its only file is its log, which never contains CV or ad content.
- **Export / Import profile (JSON)** for backup and moving to another machine.
- **UI state:** React state + one **Zustand** store per feature.

## Caching Strategy

- Parsed job requirements are cached per ad URL in `chrome.storage.local` with a 7-day TTL, so regenerating for the same ad skips that Claude call.
- The CV profile is not a cache. It is created once and edited by the user.
- No caching of tailoring plans; each generation is fresh.

## Security Patterns

**Threat: prompt injection from job ad pages** (page text is untrusted). Defenses:
- `claude -p` runs with **all tools disabled** (no file, shell, or web access), in an **empty temporary working directory**, with a **capped number of turns** and a timeout (`GENERATION_TIMEOUT`).
- Page text goes into the prompt **as clearly delimited data**, never as instructions.
- Output must pass schema and validator checks before use.

**Site access: user-managed allowlist only**
- The manifest declares **no** host permissions by default; it uses `optional_host_permissions` (`https://*/*`) and requests access **per site** via `chrome.permissions.request()` when the user adds a site.
- cv-snap reads **only sites on the user's list**. Content scripts are registered dynamically (`chrome.scripting.registerContentScripts`) for granted origins only.
- On an unlisted page, the Generate button becomes **"Add this site"**, which triggers Chrome's permission prompt for that domain, and generation continues after approval.
- On listed sites, cv-snap may **detect job ads proactively** (e.g. a badge on the icon) without a click.
- Settings offer one-click presets for common job boards (LinkedIn, Indeed, Pracuj.pl, justjoin.it, …) and let the user remove sites (which also revokes the Chrome permission). Users can also revoke access in `chrome://extensions`.

**Permissions** (required): `storage`, `unlimitedStorage`, `nativeMessaging`, `scripting`, `sidePanel`. No `<all_urls>`, no `activeTab` dependency.

**Native host hardening**
- Host manifest `allowed_origins` contains only the cv-snap extension ID.
- Every incoming message is validated with zod, with size limits enforced, before any processing.
- The host never writes to stdout except protocol frames (see coding standards → Logging).

**Privacy**
- cv-snap has no server and sends data nowhere except to Claude.
- **During generation, the CV profile and job ad are sent to Anthropic** through the user's Claude Code, under the user's Claude account terms. The UI shows a **first-run privacy notice** stating this before the first CV upload.
