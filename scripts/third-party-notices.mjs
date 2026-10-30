// Third-party notices for what cv-snap ships (bolt 016, story 002-mit-license):
// - native-host/THIRD-PARTY-NOTICES.md: packages bundled into the host (zod) or vendored (pdf.js);
// - extension/public/THIRD-PARTY-NOTICES.md: the extension's production dependency tree.
// `pnpm notices` rewrites both; a test fails when either is out of date.
import { existsSync, readdirSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

/** Workspace packages are cv-snap itself (MIT, see LICENSE): followed, not listed. */
const isWorkspace = (name) => name.startsWith("@cv-snap/");

const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));

/** Node's lookup: `node_modules/<name>` here or in any parent; real path (pnpm symlinks). */
function findPackageDir(fromDir, name) {
  for (let dir = fromDir; ; dir = dirname(dir)) {
    const candidate = join(dir, "node_modules", name);
    if (existsSync(join(candidate, "package.json"))) return realpathSync(candidate);
    if (dirname(dir) === dir) return null;
  }
}

function licenseText(packageDir) {
  const file = readdirSync(packageDir).find((name) => /^(licen[cs]e|copying)(\.|-|$)/i.test(name));
  return file ? readFileSync(join(packageDir, file), "utf8").trim() : null;
}

/**
 * Walks production dependencies (`dependencies` and installed `optionalDependencies`) from the
 * given root packages, resolved from `fromDir`. Returns one entry per package name and version.
 */
export function collectPackages(fromDir, rootNames) {
  const found = new Map();
  const visit = (parentDir, name, isOptional) => {
    const dir = findPackageDir(parentDir, name);
    if (dir === null) {
      if (isOptional) return;
      throw new Error(`Cannot find ${name} from ${parentDir}`);
    }
    const pkg = readJson(join(dir, "package.json"));
    const key = `${pkg.name}@${pkg.version}`;
    if (found.has(key) || (isWorkspace(pkg.name) && found.has(`workspace:${pkg.name}`))) return;
    if (isWorkspace(pkg.name)) found.set(`workspace:${pkg.name}`, null);
    else {
      found.set(key, {
        name: pkg.name,
        version: pkg.version,
        license: typeof pkg.license === "string" ? pkg.license : "see license text",
        text: licenseText(dir),
      });
    }
    for (const dep of Object.keys(pkg.dependencies ?? {})) visit(dir, dep, false);
    for (const dep of Object.keys(pkg.optionalDependencies ?? {})) visit(dir, dep, true);
  };
  for (const name of rootNames) visit(fromDir, name, false);
  return [...found.values()]
    .filter((entry) => entry !== null)
    .sort((a, b) => a.name.localeCompare(b.name) || a.version.localeCompare(b.version));
}

export function renderNotices(title, intro, packages) {
  const sections = packages.map((entry) =>
    [
      `## ${entry.name} ${entry.version}`,
      "",
      `License: ${entry.license}`,
      "",
      entry.text === null
        ? "_The package contains no license file; see its license field above._"
        : ["```text", entry.text, "```"].join("\n"),
    ].join("\n"),
  );
  return [`# ${title}`, "", intro, "", ...sections.flatMap((section) => [section, ""])].join("\n");
}

/** Both notice files as { path, content }, generated from the installed packages. */
export function noticeFiles() {
  const hostDir = join(ROOT, "native-host");
  const extensionDir = join(ROOT, "extension");
  // The host bundle inlines `shared` (→ zod) and vendors part of pdf.js; nothing else ships.
  const hostPackages = collectPackages(hostDir, ["@cv-snap/shared", "pdfjs-dist"]).filter(
    (entry) => entry.name !== "@napi-rs/canvas" && !entry.name.startsWith("@napi-rs/canvas-"),
  );
  const extensionPackages = collectPackages(
    extensionDir,
    Object.keys(readJson(join(extensionDir, "package.json")).dependencies ?? {}),
  );
  return [
    {
      path: join(hostDir, "THIRD-PARTY-NOTICES.md"),
      content: renderNotices(
        "Third-party notices: cv-snap-host",
        "cv-snap-host is MIT-licensed (see LICENSE). It includes the following packages: zod is bundled into dist/cv-snap-host.mjs, and part of pdf.js is shipped in dist/vendor/pdfjs-dist.",
        hostPackages,
      ),
    },
    {
      path: join(extensionDir, "public", "THIRD-PARTY-NOTICES.md"),
      content: renderNotices(
        "Third-party notices: cv-snap extension",
        "The cv-snap extension is MIT-licensed. Its bundle includes the following packages. The Noto Sans fonts are licensed under the SIL Open Font License (fonts/OFL.txt).",
        extensionPackages,
      ),
    },
  ];
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  for (const file of noticeFiles()) {
    writeFileSync(file.path, file.content, "utf8");
    process.stdout.write(`wrote ${file.path}\n`);
  }
}
