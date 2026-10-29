// `pnpm release:pack` (story 006): checks that the release is consistent, then builds
// - release/cv-snap-<version>-chrome-release.zip (upload to the Chrome Web Store) and
// - release/cv-snap-host-<version>.tgz (`npm publish` it).
// Nothing is built when a check fails; every reason is printed.
import { execSync } from "node:child_process";
import { copyFileSync, mkdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { releaseProblems } from "./release-checks.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const releaseDir = join(root, "release");
const readJson = (path) => JSON.parse(readFileSync(join(root, path), "utf8"));
const run = (command) => execSync(command, { cwd: root, stdio: "inherit" });

run("pnpm --filter @cv-snap/shared build");
const { STORE_EXTENSION_ID } = await import(pathToFileURL(join(root, "shared/dist/index.js")).href);
const extension = readJson("extension/package.json");
const host = readJson("native-host/package.json");

const problems = releaseProblems({
  extensionVersion: extension.version,
  hostVersion: host.version,
  storeExtensionId: STORE_EXTENSION_ID,
  repositoryUrl: host.repository?.url,
});
if (problems.length > 0) {
  process.stderr.write(
    `\nCan't pack the release:\n${problems.map((p) => `  - ${p}`).join("\n")}\n`,
  );
  process.exit(1);
}

rmSync(releaseDir, { recursive: true, force: true });
mkdirSync(releaseDir, { recursive: true });
run("pnpm --filter @cv-snap/extension zip:release");
const zipName = `cv-snap-${extension.version}-chrome-release.zip`;
copyFileSync(join(root, "extension", ".output", zipName), join(releaseDir, zipName));
run(`pnpm --filter cv-snap-host build`);
run(`pnpm --filter cv-snap-host pack --pack-destination "${releaseDir}"`);

const sizeMb = (name) => (statSync(join(releaseDir, name)).size / 1024 / 1024).toFixed(2);
process.stdout.write(`\nRelease ${extension.version} packed into release/:\n`);
for (const name of [zipName, `cv-snap-host-${host.version}.tgz`]) {
  process.stdout.write(`  ${name}  ${sizeMb(name)} MB\n`);
}
