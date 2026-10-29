// @vitest-environment node
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { inflateSync } from "node:zlib";
import { DEV_EXTENSION_ID, EXTENSION_PUBLIC_KEY } from "@cv-snap/shared";
import { describe, expect, it } from "vitest";
import { buildManifest, ICON_SIZES, RELEASE_MODE } from "./manifest";

const PUBLIC_DIR = fileURLToPath(new URL("../../public/", import.meta.url));
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

/** Width and height from a PNG's IHDR chunk (bytes 16–23). */
function pngSize(bytes: Buffer): { width: number; height: number } {
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

/**
 * Alpha channel of an 8-bit RGBA, non-interlaced PNG (what resvg writes): inflate the IDAT data and
 * undo the per-row filters. Enough to check transparent padding without an image library.
 */
function pngAlpha(bytes: Buffer): (x: number, y: number) => number {
  const { width, height } = pngSize(bytes);
  if (bytes[24] !== 8 || bytes[25] !== 6) throw new Error("expected 8-bit RGBA");
  const chunks: Buffer[] = [];
  for (let offset = 8; offset < bytes.length;) {
    const length = bytes.readUInt32BE(offset);
    const type = bytes.toString("latin1", offset + 4, offset + 8);
    if (type === "IDAT") chunks.push(bytes.subarray(offset + 8, offset + 8 + length));
    offset += 12 + length;
  }
  const raw = inflateSync(Buffer.concat(chunks));
  const stride = width * 4;
  const pixels = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    for (let i = 0; i < stride; i++) {
      const value = raw[y * (stride + 1) + 1 + i] ?? 0;
      const left = i >= 4 ? (pixels[y * stride + i - 4] ?? 0) : 0;
      const up = y > 0 ? (pixels[(y - 1) * stride + i] ?? 0) : 0;
      const upLeft = y > 0 && i >= 4 ? (pixels[(y - 1) * stride + i - 4] ?? 0) : 0;
      const paeth = () => {
        const p = left + up - upLeft;
        const [pa, pb, pc] = [Math.abs(p - left), Math.abs(p - up), Math.abs(p - upLeft)];
        return pa <= pb && pa <= pc ? left : pb <= pc ? up : upLeft;
      };
      const predictor = [0, left, up, (left + up) >> 1, paeth()][filter ?? 0] ?? 0;
      pixels[y * stride + i] = (value + predictor) & 0xff;
    }
  }
  return (x, y) => pixels[y * stride + x * 4 + 3] ?? 0;
}

describe("buildManifest", () => {
  it("keeps the dev key in development and production builds (stable dev ID)", () => {
    for (const mode of ["development", "production"]) {
      expect(buildManifest(mode).key).toBe(EXTENSION_PUBLIC_KEY);
    }
    expect(DEV_EXTENSION_ID).toMatch(/^[a-p]{32}$/);
  });

  it("leaves the key out of the store build and changes nothing else", () => {
    const release = buildManifest(RELEASE_MODE);
    const { key, ...devWithoutKey } = buildManifest("production");

    expect(key).toBeDefined();
    expect("key" in release).toBe(false);
    expect(release).toEqual(devWithoutKey);
  });

  it("declares the icon and the toolbar icon in 16, 32, 48 and 128 px", () => {
    const manifest = buildManifest(RELEASE_MODE);
    const expected = Object.fromEntries(
      ICON_SIZES.map((size) => [String(size), `icon/${String(size)}.png`]),
    );

    expect(manifest.icons).toEqual(expected);
    expect(manifest.action?.default_icon).toEqual(expected);
  });

  it("asks for no host permissions up front (sites are granted one by one)", () => {
    const manifest = buildManifest(RELEASE_MODE);

    expect(manifest.host_permissions).toBeUndefined();
    expect(manifest.optional_host_permissions).toEqual(["https://*/*"]);
    expect(manifest.permissions).not.toContain("tabs");
    expect(manifest.permissions).not.toContain("<all_urls>");
  });
});

describe("icon files", () => {
  it.each(ICON_SIZES)("has a %i px PNG of exactly that size", (size) => {
    const bytes = readFileSync(`${PUBLIC_DIR}icon/${String(size)}.png`);

    expect([...bytes.subarray(0, 8)]).toEqual(PNG_SIGNATURE);
    expect(pngSize(bytes)).toEqual({ width: size, height: size });
  });

  it("pads the 128 px store icon with 16 px of transparency around 96×96 artwork", () => {
    const alpha = pngAlpha(readFileSync(`${PUBLIC_DIR}icon/128.png`));

    // Inside the padding band: fully transparent on every side.
    for (const [x, y] of [
      [64, 8],
      [64, 120],
      [8, 64],
      [120, 64],
      [15, 64],
    ] as const) {
      expect(alpha(x, y), `(${String(x)}, ${String(y)})`).toBe(0);
    }
    // The artwork starts at 16 px and is opaque inside.
    expect(alpha(17, 64)).toBe(255);
    expect(alpha(64, 64)).toBe(255);
  });

  it("fills the toolbar icons edge to edge for legibility at 16 px", () => {
    const alpha = pngAlpha(readFileSync(`${PUBLIC_DIR}icon/16.png`));

    expect(alpha(8, 0)).toBeGreaterThan(200);
    expect(alpha(0, 8)).toBeGreaterThan(200);
    expect(alpha(8, 8)).toBe(255);
  });
});
