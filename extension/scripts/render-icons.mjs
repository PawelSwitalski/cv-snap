// Renders assets/icon.svg to public/icon/{16,32,48,128}.png (bolt 013). The PNGs are committed, so
// builds need no image tooling; run this only after changing the SVG:
//   pnpm --filter @cv-snap/extension icons
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Resvg } from "@resvg/resvg-js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = readFileSync(join(root, "assets", "icon.svg"), "utf8");
const outDir = join(root, "public", "icon");
mkdirSync(outDir, { recursive: true });

/**
 * Toolbar sizes use the whole canvas (legibility at 16 px). The 128 px store icon follows the
 * Chrome Web Store guideline: 96×96 artwork centred with 16 px of transparent padding.
 */
const padded = (svg) =>
  svg.replace(
    'viewBox="0 0 96 96" width="96" height="96"',
    'viewBox="-16 -16 128 128" width="128" height="128"',
  );

for (const size of [16, 32, 48, 128]) {
  const svg = size === 128 ? padded(source) : source;
  const png = new Resvg(svg, { fitTo: { mode: "width", value: size } }).render().asPng();
  writeFileSync(join(outDir, `${String(size)}.png`), png);
  process.stdout.write(`icon/${String(size)}.png ${String(png.length)} bytes\n`);
}
