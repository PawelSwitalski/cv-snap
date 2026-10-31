---
created: 2026-10-31T19:30:00Z
scope: cv-snap (Chrome extension + npm package cv-snap-host), from release 0.1.0
---

# Monitoring

There is no telemetry, by design (privacy policy, version 1): cv-snap sends nothing to its author.
Monitoring uses what the platforms show, plus what users report.

## Sources

| Source | Where | What it tells |
|---|---|---|
| Chrome Web Store dashboard | Developer Dashboard → cv-snap → Analytics, Reviews | Installs, uninstalls, weekly users, ratings, reviews; policy emails |
| npm | https://www.npmjs.com/package/cv-snap-host | Weekly downloads; versions and dist-tags |
| GitHub Issues | https://github.com/PawelSwitalski/cv-snap/issues | Bug reports (template asks for `doctor` output, never CV text); privacy contact |
| CI | https://github.com/PawelSwitalski/cv-snap/actions | `main` stays green on Windows, macOS, Ubuntu |
| Publisher email | `paswitalski+cvsnap@gmail.com` (Gmail filter → label "cv-snap") | Store reviews, rejections, policy warnings |

## Weekly check (5 minutes)

- [ ] Store dashboard: new reviews (answer them); uninstalls jumping compared with installs
- [ ] GitHub Issues: new ones labelled and answered
- [ ] npm: `latest` is the intended version (`npm view cv-snap-host dist-tags`)
- [ ] CI on `main` is green
- [ ] Publisher email: nothing from the Chrome Web Store waiting

## Signals and responses

| Signal | Likely cause | Response |
|---|---|---|
| Several "can't connect" / "host not installed" reports | Host and extension out of step, or `install` not run | Check the README install steps; `doctor` output in the issues; version mismatch → publish a matching host |
| One OS only (macOS, Linux) | Platform path or Claude Code lookup | Ask for `doctor`; fix bolt; CI job for that OS |
| "The PDF couldn't be prepared" | Rendering in the browser (see fix bolt 019) | Ask for the red console lines (`describeRenderError` logs WebAssembly messages) |
| Store policy email | Listing, permissions or privacy answers | Answer within the deadline; `store/listing.md` holds the justifications |
| Uninstalls far above installs | Setup too hard, or a broken release | Read reviews and issues; consider a setup fix first |

## Rollback

- **npm**: `npm dist-tag add cv-snap-host@<previous> latest`, then
  `npm deprecate cv-snap-host@<bad> "<reason, use <previous>>"`. Versions can't be reused.
- **Chrome Web Store**: no rollback to an earlier upload. Publish a fixed version (bump, pack,
  upload, review). Pausing distribution ("Unpublish") is the emergency stop.
- The extension and the host stay compatible across one minor version (the setup check warns on a
  major/minor mismatch, `HOST_VERSION_MISMATCH`).

## Known gaps (0.1.0)

- macOS and Linux: install, `doctor` and uninstall are tested by CI only; the full flow in Chrome
  is not yet tested by hand (no machine available). The README says so.
- No automated test runs the production build in real Chrome; bolt 019's bug (WebAssembly blocked
  by the extension's CSP) was found by hand. Candidate for the next intent.
