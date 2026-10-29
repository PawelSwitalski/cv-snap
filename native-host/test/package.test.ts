import { execFileSync, execSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { HOST_VERSION } from "../src/version.js";

/**
 * The npm package as users get it (story 001-bundled-host-package): `pnpm pack` of the host after
 * global-setup bundled it, unpacked into a temp directory.
 */
const HOST_DIR = fileURLToPath(new URL("..", import.meta.url));
/** NFR-3: the unpacked package stays small (pdfjs-dist, installed by npm, is not counted). */
const MAX_UNPACKED_BYTES = 15 * 1024 * 1024;

let workDir = "";
let packageDir = "";

beforeAll(() => {
  workDir = mkdtempSync(join(tmpdir(), "cvsnap-pack-"));
  execSync(`pnpm pack --pack-destination "${workDir}"`, { cwd: HOST_DIR, stdio: "ignore" });
  execFileSync("tar", ["-xzf", `cv-snap-host-${HOST_VERSION}.tgz`], { cwd: workDir });
  packageDir = join(workDir, "package");
}, 60_000);

afterAll(() => {
  if (workDir) rmSync(workDir, { recursive: true, force: true });
});

function listFiles(dir: string): string[] {
  return readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => relative(packageDir, join(entry.parentPath, entry.name)).replaceAll("\\", "/"))
    .sort();
}

describe("cv-snap-host npm package", () => {
  it("is a public, MIT-licensed package with a bin and Node 24+", () => {
    const pkg = JSON.parse(readFileSync(join(packageDir, "package.json"), "utf8")) as Record<
      string,
      unknown
    >;

    expect(pkg).toMatchObject({
      name: "cv-snap-host",
      version: HOST_VERSION,
      license: "MIT",
      type: "module",
      bin: { "cv-snap-host": "dist/cv-snap-host.mjs" },
      engines: { node: ">=24" },
      repository: { type: "git", directory: "native-host" },
    });
    expect(pkg.private).toBeUndefined();
    expect(pkg.dependencies).toEqual({ "pdfjs-dist": "6.4.299" });
  });

  it("has no workspace dependency left (shared is bundled)", () => {
    const text = readFileSync(join(packageDir, "package.json"), "utf8");

    expect(text).not.toContain("workspace:");
    expect(readFileSync(join(packageDir, "dist", "cv-snap-host.mjs"), "utf8")).not.toMatch(
      /from\s+["']@cv-snap\/shared["']/,
    );
  });

  it("holds only the bundle, package.json and the docs", () => {
    const allowed = new Set(["package.json", "README.md", "LICENSE", "dist/cv-snap-host.mjs"]);

    const files = listFiles(packageDir);

    expect(files).toContain("dist/cv-snap-host.mjs");
    expect(files.filter((file) => !allowed.has(file))).toEqual([]);
  });

  it("stays within 15 MB unpacked", () => {
    const total = listFiles(packageDir).reduce(
      (sum, file) => sum + statSync(join(packageDir, file)).size,
      0,
    );

    expect(total).toBeLessThanOrEqual(MAX_UNPACKED_BYTES);
  });

  it("prints its version when run from the unpacked package", () => {
    const output = execFileSync(
      process.execPath,
      [join(packageDir, "dist", "cv-snap-host.mjs"), "--version"],
      {
        cwd: workDir,
        encoding: "utf8",
      },
    );

    expect(output).toBe(`${HOST_VERSION}\n`);
  });
});
