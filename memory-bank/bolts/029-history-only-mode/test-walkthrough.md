---
stage: test
bolt: 029-history-only-mode
created: 2026-11-04T19:00:00Z
---

## Test Report: 002-history-only-mode (bolt 029)

### Summary

- **Unit tests**: 1404/1404 passed, 1 skipped (was 1370; 34 new)
- **E2E**: `pnpm test:e2e` (fresh build) 2/2 passed; the no-helper E2E test is bolt 030
- **Checks**: typecheck, lint (`--max-warnings 0`), `format:check` green

### Test Files

- [x] `extension/src/features/shell/view.test.ts` - 10 new routes: history-only upload, home, helper setup and upload; precedence of draft, profile, history and settings
- [x] `extension/src/features/shell/history-only.test.ts` - the flag: set, clear, invalid values read as off
- [x] `extension/src/features/onboarding/SetupCheck.test.tsx` - Use without the helper only when blocked; Back
- [x] `extension/src/features/cv-upload/StoreCvOnly.test.tsx` - storing a valid PDF; non-PDF, too large, empty, storage error; Back stores nothing
- [x] `extension/src/features/cv-upload/CvUpload.test.tsx` - Create my profile from my CV runs extraction on the stored file
- [x] `extension/src/features/settings/YourCvSection.test.tsx` - stored name, Replace… with a valid and a wrong file, no CV yet
- [x] `extension/src/entrypoints/sidepanel/App.test.tsx` - four whole-panel tests (below)

### Acceptance Criteria Validation

- ✅ **A failing setup check offers Use without the helper; a passing one doesn't**: SetupCheck, App
- ✅ **Upload stores the PDF with no host call and lands on history-only home**: StoreCvOnly, App (no request on the panel's host client)
- ✅ **History-only home: Save my CV, "Tailoring needs the helper", no Generate**: App
- ✅ **Reopening goes straight to history-only home without a setup check**: App (no new host client created on reopen)
- ✅ **History and Settings work in this mode**: App (History shows the "Your CV" entry; Settings shows Your CV)
- ✅ **A user with a profile is never in this mode**: view, App (flag cleared, home with Generate)
- ✅ **Helper later: check → Create my profile from my CV → editor; history and stored CV kept**: CvUpload, App
- ✅ **A check that fails again lets the user go back**: SetupCheck, App
- ✅ **An extraction error keeps the user in history-only mode**: by construction (the upload view's error and Back), covered by the existing CvUpload error tests
- ✅ **Settings → Your CV: Replace… with checks**: YourCvSection

### Issues Found

- None.

### Notes

- Add this site on history-only home reuses the extracted `AddSiteButton`; the existing GenerateView tests for Add this site still pass. There is no separate history-only test for it.
- The "no host contact after the setup check" claim is checked through the panel's host client and the setup check's client factory; the browser-level check (no host registered at all) is the E2E in bolt 030.
