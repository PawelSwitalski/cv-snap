# cv-snap-host

The helper program ("native host") of the [cv-snap](https://github.com/PawelSwitalski/cv-snap) Chrome
extension. It lets the extension tailor your CV to a job ad using Claude Code on your own computer.
There is no cv-snap server.

```sh
npx cv-snap-host install     # connect the extension to your Claude Code (this user only)
npx cv-snap-host doctor      # check the setup; prints a fix for each problem
npx cv-snap-host uninstall   # remove it again (--purge also deletes its logs)
```

Needs Node.js 24+ and Claude Code, logged in. Works on Windows, macOS and Linux (macOS and Linux tested by CI).

See the [cv-snap README](https://github.com/PawelSwitalski/cv-snap#readme) for the full setup and the
[privacy policy](https://pawelswitalski.github.io/cv-snap/privacy/).

MIT licensed. Third-party licenses: THIRD-PARTY-NOTICES.md.
