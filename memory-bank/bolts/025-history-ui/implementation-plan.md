---
stage: plan
bolt: 025-history-ui
created: 2026-11-03T16:50:55Z
---

## Implementation Plan: 002-history-ui (bolt 025)

### Objective

The user controls how long the history is kept, can delete all of it, and sees how much it holds.
The privacy notice and policy say what the history stores and how to delete it. Existing users see
the notice once more.

### Deliverables

1. **Retention setting** (story 004)
   - `features/settings/settings.ts`: `historyRetention`, either `{ mode: "forever" }` (the
     default) or `{ mode: "months", months: 1–24 }`. It is stored under
     `settings.historyRetention` and read field by field like the other settings, so an older or
     unreadable value falls back to "forever". The settings store gains
     `setHistoryRetention`.
   - `features/history/retention.ts`, pure functions:
     - `isExpired(entry, retention, now)`: the entry was last downloaded before
       `now − N calendar months`;
     - `expiredEntries(entries, retention, now)`. Sent entries expire too. Nothing newer than
       `now` is ever expired, so a clock moved back deletes nothing.
   - History store:
     - `prune(retention, now)` deletes the expired entries with their files and returns how many;
     - `clearAll()`;
     - `usage()` returns the entry count and the bytes used (the sum of `sizes`).
   - **When pruning runs:**
     - when the side panel opens, once settings and the history are loaded (App);
     - when the setting changes, after confirmation;
     - after an import (that is bolt 026; it calls `prune` too).
2. **Settings → History section** (`features/settings/HistorySection.tsx`, between Privacy and
   Backup)
   - Radio buttons: "Keep forever" or "Delete after [N] months", with a 1–24 select.
   - **Shortening the period:** if entries would be deleted, a dialog says "N entries older than
     … will be deleted". Confirming saves and prunes; cancelling keeps the old setting. If nothing
     would be deleted, it is saved at once.
   - "N entries, X MB on this computer".
   - "Delete all history" with a confirmation dialog.
3. **Privacy notice v2** (story 005)
   - New notice point `privacy_point_history` (EN/PL):
     > The CVs you download, a copy of each job-ad page and the sent dates are kept in this
     > Chrome profile only, as long as you choose in Settings; you can delete them in History or
     > Settings.
   - `PRIVACY_NOTICE_VERSION` = 2, so existing users see the notice once more, then never again.
   - `docs/privacy/index.md` and `pl.md` become **Version 2**, effective on the 0.2.0 release
     date. Today's date goes in now and is updated at the release.
     - The new point is quoted word for word in the summary.
     - "What is stored": the history (PDFs, page copies without scripts, ad text, sent dates,
       retention), stored in IndexedDB.
     - "How to delete": in History or Settings, and on uninstall.
     - "Backup": history goes into the backup file once bolt 026 lands; that sentence is added
       in 026.
   - `scripts/release-docs.test.mjs`: the new point joins the "quoted word for word" check.
   - `store/listing.md`: the `storage` / `unlimitedStorage` justifications mention the history,
     and "These answers match the privacy policy, version 2".
   - The existing in-app notice texts and the e2e harness (which clicks "I understand,
     continue") need no change.

### Dependencies

- Bolts 023 and 024: repository delete, history store, entry sizes.
- No new packages or permissions.

### Open question (for you, not blocking the code)

- **Chrome Web Store privacy practices:** the form asks which user data the item collects. The
  history is kept only on the user's computer and never sent anywhere. Google's definitions
  are about data the developer collects or transmits, so I expect the answers to stay "not
  collected". You should still confirm this in the dashboard when uploading 0.2.0. I'll note it
  in the 0.2.0 release checklist.

### Acceptance Criteria

- [ ] Settings → History offers Keep forever (default) or Delete after N months (1–24), and shows
  the entry count and space used.
- [ ] With "after N months", entries last downloaded more than N months ago are deleted with
  their files when the panel opens, sent or not.
- [ ] Shortening the period asks first, naming how many entries go; cancel keeps the old
  setting.
- [ ] Delete all history works only after confirming.
- [ ] An older settings object without the field reads as "forever".
- [ ] A clock moved back deletes nothing newer than now.
- [ ] `PRIVACY_NOTICE_VERSION` = 2: an existing user sees the notice once, then not again. The
  notice and the policy (EN/PL) cover the history. The policy version and date match. The
  docs test passes.
- [ ] Typecheck, lint, format, all tests and `pnpm test:e2e` pass.
