// Builds the publishable host into dist/ (bolts 014, 015):
// - dist/cv-snap-host.mjs: one bundle with `shared` and zod inlined;
// - dist/vendor/pdfjs-dist/: the part of pdf.js the host loads (~7 MB of 35 MB), imported by
//   relative path. pdf.js finds its worker next to itself, so it is copied, not bundled.
// The package therefore has no runtime dependencies, and `install` copies dist/ as it is.
import { cpSync, readFileSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "rolldown";

const PDFJS_IMPORT = "pdfjs-dist/legacy/build/pdf.mjs";
const VENDOR_PDFJS = "./vendor/pdfjs-dist";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const distDir = join(root, "dist");
/** Text extraction in Node needs these; checked by the end-to-end PDF test on the installed copy. */
const PDFJS_RUNTIME_FILES = JSON.parse(
  readFileSync(join(root, "scripts", "pdfjs-runtime-files.json"), "utf8"),
);
const pdfjsRoot = dirname(
  createRequire(join(root, "package.json")).resolve("pdfjs-dist/package.json"),
);

rmSync(distDir, { recursive: true, force: true });
await build({
  input: join(root, "src", "main.ts"),
  platform: "node",
  logLevel: "warn",
  plugins: [
    {
      name: "vendored-pdfjs",
      resolveId(source) {
        if (source === PDFJS_IMPORT) {
          return { id: `${VENDOR_PDFJS}/legacy/build/pdf.mjs`, external: true };
        }
        if (source.startsWith("pdfjs-dist")) throw new Error(`Unvendored pdf.js import: ${source}`);
        return null;
      },
    },
  ],
  output: { file: join(distDir, "cv-snap-host.mjs"), format: "esm", codeSplitting: false },
});
for (const file of PDFJS_RUNTIME_FILES) {
  cpSync(join(pdfjsRoot, file), join(distDir, "vendor", "pdfjs-dist", file), {
    recursive: true,
    dereference: true,
  });
}
process.stdout.write(`bundled ${distDir}\n`);
