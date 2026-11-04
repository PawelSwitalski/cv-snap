---
intent: 004-application-history
phase: inception
status: construction
created: '2026-11-03T15:13:06Z'
updated: '2026-11-03T15:23:11Z'
---

# Requirements: Application History

## Intent Overview

Planned for 0.2.0 (split from the user's 0.2.0 ideas in intent 003's inception, 2026-11-02).
Today a tailored CV lives only for the current browser session (`generate.lastResult` in
`storage.session`): once the browser closes, the user can't see which ads they applied to or
which CV they sent. This intent adds:

- a local **history**: one entry per job ad, holding the last downloaded PDF, the ad's details
  and a cleaned snapshot of the job-ad page;
- **mark as sent** with a date;
- a **retention setting** (keep forever, or delete after N months), with history in the backup;
- **Playwright end-to-end tests** for the one-click flow and the history flow, in CI on Ubuntu and
  locally, with a fake AI provider.

## Business Goals

| Goal | Success Metric | Priority |
|------|----------------|----------|
| The user can find every CV they sent | Every downloaded CV is in the History tab after a browser restart, with its ad and PDF | Must |
| The user knows where they applied | Each entry shows sent / not sent with a date; the list filters by it | Must |
| The ad survives after it's taken down | The saved page opens offline from history | Must |
| The user controls how long data is kept | Retention setting works; old entries are removed on schedule | Must |
| Regressions in the main flow are caught before a release | Playwright one-click and history tests run green in CI on every push | Must |

---

## Functional Requirements

### FR-1: Download saves the CV to history

- **Description**: Clicking **Download PDF** saves (or updates) the history entry for the ad of
  the current result. There is one entry per ad, identified by the ad's `AdKey` (normalised URL
  plus content fingerprint, as for the requirements cache). Downloading again for the same ad
  replaces that entry's PDF and updates its "last downloaded" date; the sent status is kept.
- **Acceptance Criteria**:
  - After Download PDF, the History tab has an entry for the ad with: job title, company (each
    may be empty if unknown), ad URL (null for a manual selection), output language, the PDF
    file name, the exact PDF bytes that were downloaded, the created date and the
    last-downloaded date.
  - Downloading a second time for the same ad leaves one entry, with the new PDF and date.
  - A different ad (different `AdKey`) creates a new entry.
  - The Generate view shows a short "Saved to history" confirmation after the download.
  - If saving fails (e.g. a storage error), the download still happens and the user sees a
    non-blocking message that the CV wasn't saved to history.
- **Priority**: Must

### FR-2: Cleaned snapshot of the job-ad page

- **Description**: When the ad is captured for a generation, cv-snap also takes a snapshot of the
  page's HTML. It is cleaned: scripts, inline event handlers, `<iframe>`/`<object>`/`<embed>`,
  form actions and `<base>` are removed; relative links and images are made absolute; a strict
  CSP (`script-src 'none'`) and a banner ("Saved by cv-snap on {date} from {original URL}") are
  added. The snapshot is kept with the session result and stored in the history entry on
  download.
- **Acceptance Criteria**:
  - The snapshot is taken at capture time, so it matches the ad the CV was made for even if the
    tab has navigated away by download time.
  - No script from the saved page can run when the snapshot is opened (test: a fixture page with
    inline, external and event-handler scripts; none runs).
  - Images and styles load from their original URLs when online; the ad text is readable
    offline.
  - For a manual selection, the snapshot is still the full page (the selection is in the entry's
    ad text).
  - A snapshot over 5 MB after cleaning is not saved; the entry keeps the ad text only and the
    History tab says the page was too large to save.
- **Priority**: Must

### FR-3: History tab

- **Description**: A third view in the side panel, next to Generate and Settings, listing all
  entries.
- **Acceptance Criteria**:
  - Each row shows company, job title, last-downloaded date and sent status (with the sent date).
  - Sorted newest (last downloaded) first.
  - A search box filters by company and title (case- and diacritics-insensitive).
  - A filter: All / Sent / Not sent.
  - Row actions: **Open PDF** (new tab), **Open saved page** (new tab, the snapshot), **Open
    original ad** (the URL, if any), **Mark as sent / Mark as not sent**, **Delete** (with
    confirmation).
  - An empty state explains that CVs appear here after Download PDF.
  - UI text in English and Polish, like the rest of the extension.
- **Priority**: Must

### FR-4: Mark as sent

- **Description**: Each entry is either not sent or sent on a date.
- **Acceptance Criteria**:
  - Mark as sent sets the date to today; the user can change it (date picker, not in the
    future).
  - Mark as not sent clears the date.
  - The status survives re-downloads (FR-1) and browser restarts.
  - Mark as sent is also available in the Generate view after the download, for the current ad.
- **Priority**: Must

### FR-5: Already-in-history hint

- **Description**: When the ad in the current tab already has a history entry, the Generate view
  says so ("You downloaded a CV for this ad on {date}" / "… and sent it on {date}") with a link
  to the entry.
- **Acceptance Criteria**:
  - The hint appears for an ad whose `AdKey` matches an entry, before and after generating.
  - It doesn't block generating again.
- **Priority**: Should

### FR-6: Retention setting

- **Description**: Settings → History: **Keep forever** (default) or **Delete after N months**
  (N from 1 to 24). Entries whose last-downloaded date is older than N months are deleted,
  whether sent or not. Settings also has **Delete all history** (with confirmation).
- **Acceptance Criteria**:
  - Pruning runs when the side panel opens and when the setting changes; switching to a shorter
    period first shows how many entries will be deleted and asks to confirm.
  - Deleting an entry (by pruning or by hand) also deletes its PDF and snapshot.
  - Settings shows how many entries there are and how much space history uses.
- **Priority**: Must

### FR-7: History in the backup

- **Description**: Export includes the history (metadata, PDFs, snapshots) next to the profile.
  Import restores it, merging by `AdKey`: for the same ad, the entry with the later
  last-downloaded date wins; the sent status is kept if either side has one.
- **Acceptance Criteria**:
  - A backup with history, imported on a clean Chrome profile, restores the profile and every
    entry with identical PDFs and snapshots.
  - Existing profile-only backups (format `cv-snap-profile`, 0.1.x) still import.
  - Export shows the file size before saving when history makes it larger than 50 MB.
  - Import applies the retention setting afterwards (FR-6).
- **Priority**: Must

### FR-8: Privacy notice and policy updated

- **Description**: The in-app privacy notice and the privacy policy (`docs/privacy`, EN and PL)
  say that history (CVs, job-ad page copies, sent dates) is stored only on this PC, how long it is
  kept, and how to delete it.
- **Acceptance Criteria**:
  - `PRIVACY_NOTICE_VERSION` is raised to 2, and the policy version with it; existing users see
    the notice again once.
- **Priority**: Must

### FR-9: Playwright E2E: one-click flow

- **Description**: A Playwright test loads the built (unpacked, dev-ID) extension in Chromium and
  runs: open a fixture job-ad page → Generate → preview → Download PDF.
- **Acceptance Criteria**:
  - The real native host runs with a **fake AI provider** that returns canned profile,
    requirements and plan JSON (no Claude Code, no network).
  - The test asserts the progress steps, the preview content, and that a PDF file was downloaded
    and starts with `%PDF`.
  - The profile is seeded (no CV upload in this test).
- **Priority**: Must

### FR-10: Playwright E2E: history flow

- **Description**: Download creates an entry; mark as sent; open the PDF and the saved page;
  re-download replaces; delete; retention.
- **Acceptance Criteria**:
  - Covers FR-1 (create and replace), FR-2 (snapshot opens, no script runs), FR-3 (list, search,
    filter), FR-4 (sent toggle) and FR-6 (pruning a backdated entry).
- **Priority**: Must

### FR-11: E2E in CI and locally

- **Description**: `pnpm test:e2e` runs the suite locally (Windows), and a CI job runs it on
  Ubuntu on every push.
- **Acceptance Criteria**:
  - The CI job is green and uploads the Playwright trace and report on failure.
  - The test harness registers the native host for the test browser only and removes it
    afterwards; it never touches a real cv-snap installation.
- **Priority**: Must

---

## Non-Functional Requirements

### Storage

| Requirement | Metric | Target |
|-------------|--------|--------|
| Entry size | PDF + cleaned snapshot | Typically < 1 MB; snapshot capped at 5 MB (FR-2) |
| Capacity | Entries without slowdown | 500 entries: the History tab opens in < 500 ms |

### Performance

| Requirement | Metric | Target |
|-------------|--------|--------|
| Download | Extra time added by saving to history | < 300 ms for a typical entry; never delays the download |
| Snapshot | Extra capture time | < 500 ms on a typical job-board page |

### Security / Privacy

| Requirement | Standard | Notes |
|-------------|----------|-------|
| Local only | Same as today | History lives in IndexedDB on this PC; nothing new is sent to the host or anywhere else |
| Saved pages are inert | CSP `script-src 'none'` + script removal | Snapshots open in a way that can't run page code or reach extension APIs |
| Fake provider unreachable in production | Build/package check | The fake AI provider is enabled only by a test-only environment variable; a host test asserts the extension can't select it |

### Reliability

| Requirement | Metric | Target |
|-------------|--------|--------|
| E2E stability | Flaky runs | 10 consecutive green CI runs with no retries before release |
| Data safety | Schema changes | History has a `schemaVersion`; unreadable entries are skipped and reported, never crash the view |

---

## Constraints

### Technical Constraints

**Project-wide standards** are loaded by the Construction Agent.

**Intent-specific constraints:**

- Everything stays on the user's PC (IndexedDB for PDFs and snapshots, `storage.local` for the
  index and settings).
- No new Chrome permissions (the snapshot comes from the existing content-script capture, not
  `pageCapture`).
- Playwright runs Chromium with the unpacked dev build (fixed `key` → the dev ID the host allows).

### Business Constraints

- Ships as **0.2.0** for both packages (the host gains the fake provider used by E2E); release
  0.1.1 finishes first.

---

## Assumptions

| Assumption | Risk if Invalid | Mitigation |
|------------|-----------------|------------|
| Chromium under Playwright can reach a native host registered for the test (Linux: user-level manifest directory; Windows: HKCU) | E2E can't run the real host | Fall back to a fake native port in a test build of the extension (the host stays covered by its own tests) |
| One entry per ad is enough (latest PDF only) | The user wants older versions | Versions per entry can be added later; the data model leaves room for a list |
| Cleaned snapshots are readable on the preset job boards | Some boards render the ad only with scripts | The entry always keeps the extracted ad text; the History tab shows it when the snapshot is empty |

---

## Open Questions

| Question | Owner | Due Date | Resolution |
|----------|-------|----------|------------|
| Backup file format with binaries (one JSON with base64, or ZIP) | Construction (design) | Bolt design | Decided 2026-11-04: one JSON with base64 (existing envelope + optional `history`); ZIP deferred until real-usage feedback; 50 MB export warning |
