---
stage: plan
bolt: 016-ci-and-release-docs
created: 2026-10-29T20:05:00Z
---

## Implementation Plan: ci-and-release-docs

### Objective

Everything a public release needs besides the code:
- CI on Windows, macOS and Linux;
- the MIT license and third-party notices;
- a README for end users;
- a public privacy policy that matches the in-app notice;
- the Chrome Web Store listing texts, ready to paste.

### Deliverables

**CI on three OSes (story 001)**: `.github/workflows/ci.yml`, on push and pull request.
- Job `check` (Ubuntu, Node 24, pnpm from `packageManager`): `pnpm install --frozen-lockfile`,
  typecheck, lint, format check, `pnpm test` (this includes the tarball allowlist test, NFR-1,
  and the real shell-launcher test that is skipped on Windows), `pnpm build`, `zip:release`.
- Job `install` (matrix: `windows-latest`, `macos-latest`, `ubuntu-latest`):
  1. build and `pnpm pack` the host;
  2. in an empty directory, `npx ./cv-snap-host-<v>.tgz install`;
  3. `doctor --skip-claude`, which must exit 0;
  4. `uninstall`, then a check that the manifest (or registry key) is gone.
- `doctor --skip-claude` (new flag): Claude Code isn't on CI runners, so the two Claude checks
  are left out and the output says so. `routeArgs` accepts the flag only for `doctor`.
- The workflow is committed now and runs once the repository is on GitHub.

**License and notices (story 002)**
- `LICENSE` at the root: MIT, "Copyright (c) 2026 Paweł Świtalski". An identical copy in
  `native-host/LICENSE` ships in the package, and a test keeps the two the same.
- `scripts/third-party-notices.mjs` writes `THIRD-PARTY-NOTICES.md`:
  - for the host package: zod (bundled) and pdf.js (vendored, Apache-2.0);
  - for the extension zip: every production dependency in the bundle (React, react-pdf, zustand,
    zod and so on), with each license text taken from `node_modules`.

  It runs as part of each build. A test checks that every bundled package is listed.
- The Noto Sans `OFL.txt` already ships in `extension/public/fonts/`. A test checks it is in the
  release zip.
- The `license: MIT` field goes in every `package.json`.

**End-user README (story 003)**
- `README.md` for users first:
  - what cv-snap does;
  - prerequisites (Chrome, Node 24+, Claude Code logged in);
  - install from the store (link placeholder), then `npx cv-snap-host install`;
  - first run;
  - uninstall (`npx cv-snap-host uninstall [--purge]`);
  - privacy summary linking the policy;
  - troubleshooting per setup error, starting with `npx cv-snap-host doctor`.
- The "early development" line goes. The development setup moves below a "Development" heading.
- `README.pl.md`: the same user part in Polish, linked from the top of `README.md`.
- In-app setup hints and fixes (`hint_` / `fix_` for HOST_NOT_INSTALLED and HOST_DISCONNECTED, PL
  and EN) say `npx cv-snap-host install` instead of the developer command (noted in bolt 015).

**Privacy policy (story 004)**
- `docs/privacy/index.md` (EN) and `docs/privacy/pl.md` (PL), published by GitHub Pages from
  `docs/`. Each page carries "Version 1", the same number as `PRIVACY_NOTICE_VERSION`, and a date.
- Content:
  - **What goes to Anthropic:** the CV profile and the job-ad text, through the user's own Claude
    Code, under their Claude account terms. Claude Code runs with session persistence off.
  - **No cv-snap servers, no telemetry, no analytics.**
  - **Stored locally:** in the Chrome profile, the CV file, profile, settings and job-requirements
    cache; the generated CV only in session storage, until Chrome closes. On the computer, host
    logs without CV or ad text.
  - **How to delete it:** remove the extension, then `npx cv-snap-host uninstall --purge`.
  - **Contact.**
- A test keeps the policy and the in-app notice in step: the version numbers must match, and each
  in-app point must have its counterpart in the policy.

**Store listing texts (story 005)**
- `store/listing.md`, PL and EN:
  - name;
  - short description (≤ 132 characters);
  - full description;
  - single-purpose statement;
  - a justification for every permission (`storage`, `unlimitedStorage`, `nativeMessaging`,
    `scripting`, `sidePanel`, `activeTab`, optional `https://*/*`);
  - the data-use answers, matching the policy: personal info (CV), not sold, not used for
    unrelated purposes, not used for creditworthiness;
  - the five 1280×800 screenshots and what each shows.
- A test (extension project) checks that each short description is ≤ 132 characters, and that the
  permissions justified in the listing are exactly the manifest's permissions (so a new
  permission can't ship without a justification).

### Decisions (accept or adjust)

- **a. Listing location `store/listing.md`, not `release/store-listing.md`**: `release/` became
  the git-ignored output folder of `release:pack` in bolt 015.
- **b. Third-party notices for the extension too**: the story asks only for the host, but the
  extension zip bundles MIT and other libraries whose licenses require the notice to ship with
  it. It is one script for both.
- **c. Contact in the privacy policy: GitHub Issues of the repository** (URL placeholder until the
  repository exists). An email address is the alternative. The policy is public, so I'm not
  putting your address in without your say.
- **d. Polish**: `README.pl.md` (user part only) and `docs/privacy/pl.md`.
- **e. The policy and the listing stay Markdown** (rendered by GitHub Pages), no HTML pages or
  site generator.

### Technical Approach

- The documents are checked by tests where they can drift:
  - listing permissions against the manifest;
  - policy version against the notice;
  - notices against the bundle;
  - the two LICENSE files against each other.
- CI reuses the real commands (`npx` on the packed tarball), so the install job proves what a
  user will run.

### Acceptance Criteria

- [ ] CI: Ubuntu runs typecheck, lint, format, all tests and both builds; the install job runs
  install → doctor (registration) → uninstall from the tarball on all three OSes; the tarball
  allowlist is checked; any failure fails the job
- [ ] `LICENSE` (MIT, author, year) at the root and in the host package; OFL notice kept;
  `license` fields MIT; third-party notices shipped
- [ ] README: prerequisites, store install, `npx cv-snap-host install`, first run, uninstall,
  privacy summary with link, troubleshooting with `doctor`; no "early development"; development
  setup below; a Polish version
- [ ] Privacy policy (EN, PL): Anthropic, no servers or telemetry, local storage and deletion,
  contact; dated and versioned; matches the in-app notice (checked by a test)
- [ ] Listing: PL and EN name, short (≤ 132, tested) and full description, single purpose; every
  permission justified (tested against the manifest); data-use answers; five screenshots planned
