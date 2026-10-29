import * as nodeFs from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

/**
 * Copies the host runtime into the per-user host directory (story 003-stable-install-location), so
 * the installed host doesn't depend on the npx cache or the repository it was installed from.
 *
 * Layout: `<hostDir>/runtime/{cv-snap-host.mjs, package.json, node_modules/pdfjs-dist/…}`. The copy
 * goes to `runtime.new/` first and is swapped in with two renames, so a failure at any step leaves
 * the previous runtime in place.
 */

export const RUNTIME_ENTRY = "cv-snap-host.mjs";

/** The parts of pdfjs-dist the host loads (text extraction in Node); ~7 MB instead of 35 MB. */
export const PDFJS_RUNTIME_FILES = [
  "package.json",
  "LICENSE",
  "legacy/build/pdf.mjs",
  "legacy/build/pdf.worker.mjs",
  "cmaps",
  "standard_fonts",
  "wasm",
] as const;

/** Windows refuses to move or delete files of a running host. */
export class HostInUseError extends Error {
  constructor(options?: { cause?: unknown }) {
    super("The cv-snap host is running, so its files can't be replaced", options);
    this.name = "HostInUseError";
  }
}

export const isFileLockError = (error: unknown): boolean =>
  error instanceof Error &&
  "code" in error &&
  ["EBUSY", "EPERM", "EACCES"].includes(String(error.code));

export type RuntimeFs = Pick<
  typeof nodeFs,
  "cpSync" | "existsSync" | "mkdirSync" | "renameSync" | "rmSync" | "writeFileSync"
>;

export interface StageRuntimeOptions {
  hostDir: string;
  /** The bundled host (`dist/cv-snap-host.mjs` of the package being installed). */
  bundlePath: string;
  /** Root directory of the installed `pdfjs-dist` package. */
  pdfjsRoot: string;
  version: string;
  fs?: RuntimeFs;
}

export function runtimeDir(hostDir: string): string {
  return join(hostDir, "runtime");
}

/** Copies and swaps in the runtime; returns the path the launcher must start. */
export function stageRuntime(options: StageRuntimeOptions): { entryPath: string } {
  const fs = options.fs ?? nodeFs;
  const current = runtimeDir(options.hostDir);
  const next = `${current}.new`;
  const previous = `${current}.old`;
  const remove = (path: string) => {
    fs.rmSync(path, { recursive: true, force: true });
  };

  // An earlier install that stopped between the two renames: put the old runtime back first.
  if (!fs.existsSync(current) && fs.existsSync(previous)) fs.renameSync(previous, current);
  remove(next);
  remove(previous);

  try {
    fs.mkdirSync(next, { recursive: true });
    fs.cpSync(options.bundlePath, join(next, RUNTIME_ENTRY));
    const manifest = { name: "cv-snap-host-runtime", version: options.version, type: "module" };
    fs.writeFileSync(join(next, "package.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
    for (const file of PDFJS_RUNTIME_FILES) {
      fs.cpSync(join(options.pdfjsRoot, file), join(next, "node_modules", "pdfjs-dist", file), {
        recursive: true,
        dereference: true,
      });
    }
  } catch (error) {
    remove(next);
    throw error;
  }

  if (fs.existsSync(current)) {
    try {
      fs.renameSync(current, previous);
    } catch (error) {
      remove(next);
      throw isFileLockError(error) ? new HostInUseError({ cause: error }) : error;
    }
  }
  try {
    fs.renameSync(next, current);
  } catch (error) {
    if (fs.existsSync(previous)) fs.renameSync(previous, current);
    remove(next);
    throw error;
  }
  try {
    remove(previous);
  } catch {
    // A leftover `runtime.old` is harmless and removed by the next install.
  }
  return { entryPath: join(current, RUNTIME_ENTRY) };
}

/** Finds `pdfjs-dist` the way the bundle imports it: hoisted (npx) or a pnpm symlink (repo). */
export function resolvePdfjsRoot(fromFile: string): string {
  const require = createRequire(fromFile);
  // pdfjs-dist has no `exports` map, so its package.json is resolvable directly.
  return dirname(require.resolve("pdfjs-dist/package.json"));
}
