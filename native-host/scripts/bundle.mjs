// Bundles the host into one file, dist/cv-snap-host.mjs (bolt 014): `shared` and zod are inlined,
// so the published package has no workspace dependency. pdfjs-dist stays external: pdf.js loads its
// worker file relative to its own location.
import { rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "rolldown";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outFile = join(root, "dist", "cv-snap-host.mjs");

rmSync(join(root, "dist"), { recursive: true, force: true });
await build({
  input: join(root, "src", "main.ts"),
  platform: "node",
  external: [/^pdfjs-dist(\/|$)/],
  logLevel: "warn",
  output: { file: outFile, format: "esm", codeSplitting: false },
});
process.stdout.write(`bundled ${outFile}\n`);
