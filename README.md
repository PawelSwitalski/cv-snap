# cv-snap

[Polski](README.pl.md)

cv-snap is a Chrome extension that tailors your CV to the job ad open in the current tab, with one
click. It uses **your own Claude Code** on your computer: there is no cv-snap server and no
account. Every line of the tailored CV is checked against a profile you reviewed, so nothing is
invented.

## What you need

- **Google Chrome** (stable), on Windows 10/11, macOS 13+ or Linux (for example Ubuntu 22.04+).
  Windows is tested by hand; on macOS and Linux the helper's install and setup check are tested
  automatically, but not yet the whole flow in Chrome. Problems there are welcome as
  [issues](https://github.com/PawelSwitalski/cv-snap/issues).
- **Node.js 24 or newer** ([nodejs.org](https://nodejs.org)); it runs the small helper program that
  connects Chrome to Claude Code
- **Claude Code**, installed and logged in ([claude.com/claude-code](https://claude.com/claude-code)).
  Run `claude` once in a terminal and log in. cv-snap uses your Claude plan; it costs nothing
  extra.

## Install

1. **Add the extension** from the Chrome Web Store: _link follows with the first release_.
2. **Install the helper** (the "native host") in a terminal:

   ```sh
   npx cv-snap-host install
   ```

   It installs for your user only (no admin rights) and tells Chrome where to find it. Then reload
   the extension, or restart Chrome.

3. **Check the setup** at any time:

   ```sh
   npx cv-snap-host doctor
   ```

## First run

1. Click the cv-snap icon in the toolbar to open the side panel.
2. Read the privacy notice (summary below) and continue.
3. The setup check confirms the helper and Claude Code are ready.
4. Upload your CV as a PDF (with selectable text, up to 10 MB). Claude builds a profile from it;
   review and confirm it. Only this profile is used for tailoring.
5. Open a job ad. On a site you haven't used yet, click **Add this site**; Chrome asks for
   permission for that one site.
6. Click **Generate CV**. Check the preview, edit lines if you like, and click **Download PDF**.

The model, the language and the GDPR clause are in **Settings**, together with backup and restore
of your profile.

## Privacy

- When you generate a CV, your CV profile and the job ad are sent to Anthropic **through your own
  Claude Code**, under your Claude account terms.
- cv-snap has no server, no telemetry and no analytics. Nothing is sent to cv-snap or anyone else.
- Your CV, profile and settings stay in this Chrome profile on this computer. The helper's logs
  never contain your CV or job-ad text.

Read the full [privacy policy](https://pawelswitalski.github.io/cv-snap/privacy/).

## Uninstall

1. Remove the extension in `chrome://extensions`. This deletes everything it stored in Chrome.
2. Remove the helper:

   ```sh
   npx cv-snap-host uninstall          # keeps the helper's logs
   npx cv-snap-host uninstall --purge  # removes the logs too
   ```

## Troubleshooting

Start with `npx cv-snap-host doctor`. It checks every step from Chrome to Claude Code and prints a
fix for each problem.

| The side panel says                                     | What to do                                                                                                                                                   |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| The cv-snap native host is not installed.               | Run `npx cv-snap-host install`, then click **Check again**.                                                                                                  |
| The connection to the native host was lost.             | Click **Reconnect**. If it keeps happening, run `npx cv-snap-host doctor`. Did Node move or change version (nvm, fnm)? Run `npx cv-snap-host install` again. |
| Claude Code was not found on this computer.             | Install Claude Code, then click **Check again**.                                                                                                             |
| Claude Code is not logged in.                           | Run `claude` in a terminal and log in, then click **Check again**.                                                                                           |
| Your Claude Code is older than the tested version.      | Run `claude update` (you can continue meanwhile).                                                                                                            |
| The cv-snap host version doesn’t match this extension.  | Run `npx cv-snap-host install` to update the helper.                                                                                                         |
| The selected model isn't available on your Claude plan. | Pick another model in **Settings**.                                                                                                                          |
| This PDF has no selectable text.                        | Scanned PDFs aren't supported; export your CV as a text PDF.                                                                                                 |

`install` says the host is running? Close the cv-snap side panel (or Chrome) and run it again.

## License

[MIT](LICENSE). Third-party licenses: [extension](extension/public/THIRD-PARTY-NOTICES.md),
[native host](native-host/THIRD-PARTY-NOTICES.md). The bundled Noto Sans fonts are under the
[SIL Open Font License](extension/public/fonts/OFL.txt).

Questions or problems: [GitHub Issues](https://github.com/PawelSwitalski/cv-snap/issues).

---

## Development

### Repository layout

```text
cv-snap/
├── extension/    # WXT + React Chrome extension (side panel, background worker, content scripts)
├── native-host/  # the cv-snap-host npm package: native-messaging host that runs headless Claude Code
├── shared/       # zod schemas + types shared by both: CV profile, job requirements,
│                 # tailoring plan, native-messaging protocol, error codes, provider interface
├── scripts/      # release packing and checks, third-party notices
├── docs/         # GitHub Pages: the privacy policy
└── store/        # Chrome Web Store listing texts
```

### Prerequisites

- Node.js ≥ 24, pnpm 12 (`npm install -g pnpm` or `corepack enable pnpm`)
- Google Chrome (stable), Claude Code ≥ 2.1.302, logged in (`claude auth status`)

### Setup

```sh
pnpm install          # installs all workspaces and the git pre-commit hook
pnpm build            # shared → native-host → extension
pnpm run install-host # registers the locally built host (same code path as `npx cv-snap-host install`)
pnpm dev              # builds shared, then starts WXT: opens Chrome with the extension loaded
```

`pnpm dev` launches a separate Chrome profile with the unpacked extension. Click the cv-snap toolbar
icon to open the side panel.

To load the production build manually instead: `pnpm build`, then in `chrome://extensions` enable
**Developer mode** → **Load unpacked** → select `extension/.output/chrome-mv3`. The development and
production builds share one extension ID, which the installed host trusts. The store build
(`pnpm --filter @cv-snap/extension zip:release`) has the Chrome Web Store ID instead.

### Quality checks

```sh
pnpm typecheck        # tsc --noEmit in every package
pnpm lint             # ESLint (typescript-eslint strictTypeChecked), zero warnings allowed
pnpm format:check     # Prettier (printWidth 100); `pnpm format` to fix
pnpm test             # Vitest (shared, native-host, extension, scripts projects)
pnpm test:coverage    # with coverage; thresholds 80% for shared/ and native-host/
```

The pre-commit hook (husky + lint-staged) runs ESLint and Prettier on staged files and blocks the
commit on any problem. CI (`.github/workflows/ci.yml`) runs everything on Ubuntu and installs the
packed host from its tarball on Windows, macOS and Linux.

### Release

```sh
pnpm notices          # regenerate the third-party notices after dependency changes
pnpm release:pack     # checks versions, store ID and repository, then writes release/
```

`release:pack` writes the store zip and the `cv-snap-host` tarball to `release/`. The listing texts
are in `store/listing.md`.

### Conventions

See `memory-bank/standards/` (tech stack, coding standards, architecture, UX guide). In short:

- TypeScript strict with `noUncheckedIndexedAccess`; no `any`; no `console` outside the logger
  modules (stdout is the native-messaging channel in the host).
- Anything that crosses the native-messaging connection is defined in `shared/` and validated with
  zod on receipt. `shared/src/index.ts` is the only barrel export.
- `TODO`/`FIXME` comments need a reference: `TODO(006-deterministic-validator): …` or `TODO(#12)`.
- Never log CV contents, job-ad text or personal data.
- `exampleCV/` (raw sample CVs) is git-ignored; test fixtures must be anonymized.
