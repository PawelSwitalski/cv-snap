import * as nodeFs from "node:fs";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  HostInUseError,
  isFileLockError,
  PDFJS_RUNTIME_FILES,
  resolvePdfjsRoot,
  runtimeDir,
  stageRuntime,
  type RuntimeFs,
} from "./runtime.js";

const dirs: string[] = [];
afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

/** A source package (bundle + fake pdfjs-dist) and an empty host dir, in a non-ASCII temp path. */
function setup(bundleText = "// bundle v1\n") {
  const root = mkdtempSync(join(tmpdir(), "cv snap Zażółć "));
  dirs.push(root);
  const bundlePath = join(root, "src", "cv-snap-host.mjs");
  mkdirSync(join(root, "src"), { recursive: true });
  writeFileSync(bundlePath, bundleText);
  const pdfjsRoot = join(root, "pdfjs-dist");
  for (const file of PDFJS_RUNTIME_FILES) {
    const isDir = ["cmaps", "standard_fonts", "wasm"].includes(file);
    const target = isDir ? join(pdfjsRoot, file, "data.bin") : join(pdfjsRoot, file);
    mkdirSync(join(target, ".."), { recursive: true });
    writeFileSync(target, file);
  }
  writeFileSync(join(pdfjsRoot, "legacy", "build", "pdf.mjs.map"), "not copied");
  return { root, bundlePath, pdfjsRoot, hostDir: join(root, "host") };
}

const lockError = (code = "EBUSY") => Object.assign(new Error(`${code}: resource busy`), { code });

/** Real fs, except the n-th call of `method` (1-based) throws. */
function failingFs(method: keyof RuntimeFs, onCall: number, error: Error): RuntimeFs {
  let calls = 0;
  return new Proxy(nodeFs, {
    get(target, prop) {
      const value: unknown = Reflect.get(target, prop);
      if (prop !== method || typeof value !== "function") return value;
      return (...args: unknown[]) => {
        calls += 1;
        if (calls === onCall) throw error;
        return (value as (...a: unknown[]) => unknown)(...args);
      };
    },
  });
}

describe("stageRuntime", () => {
  it("copies the bundle, a runtime package.json and the allowlisted pdf.js files", () => {
    const { bundlePath, pdfjsRoot, hostDir } = setup();

    const { entryPath } = stageRuntime({ hostDir, bundlePath, pdfjsRoot, version: "0.1.0" });

    const runtime = runtimeDir(hostDir);
    expect(entryPath).toBe(join(runtime, "cv-snap-host.mjs"));
    expect(readFileSync(entryPath, "utf8")).toBe("// bundle v1\n");
    expect(JSON.parse(readFileSync(join(runtime, "package.json"), "utf8"))).toEqual({
      name: "cv-snap-host-runtime",
      version: "0.1.0",
      type: "module",
    });
    const pdfjs = join(runtime, "node_modules", "pdfjs-dist");
    expect(existsSync(join(pdfjs, "legacy", "build", "pdf.worker.mjs"))).toBe(true);
    expect(existsSync(join(pdfjs, "cmaps", "data.bin"))).toBe(true);
    expect(existsSync(join(pdfjs, "legacy", "build", "pdf.mjs.map"))).toBe(false);
    expect(existsSync(`${runtime}.new`)).toBe(false);
    expect(existsSync(`${runtime}.old`)).toBe(false);
  });

  it("keeps working after the source is deleted (npx cache cleared)", () => {
    const { root, bundlePath, pdfjsRoot, hostDir } = setup();
    const { entryPath } = stageRuntime({ hostDir, bundlePath, pdfjsRoot, version: "0.1.0" });

    rmSync(join(root, "src"), { recursive: true });
    rmSync(pdfjsRoot, { recursive: true });

    expect(readFileSync(entryPath, "utf8")).toBe("// bundle v1\n");
  });

  it("upgrades in place", () => {
    const { bundlePath, pdfjsRoot, hostDir } = setup();
    stageRuntime({ hostDir, bundlePath, pdfjsRoot, version: "0.1.0" });
    writeFileSync(join(runtimeDir(hostDir), "stale.txt"), "from 0.1.0");
    writeFileSync(bundlePath, "// bundle v2\n");

    const { entryPath } = stageRuntime({ hostDir, bundlePath, pdfjsRoot, version: "0.2.0" });

    expect(readFileSync(entryPath, "utf8")).toBe("// bundle v2\n");
    expect(existsSync(join(runtimeDir(hostDir), "stale.txt"))).toBe(false);
    expect(readFileSync(join(runtimeDir(hostDir), "package.json"), "utf8")).toContain("0.2.0");
  });

  it("leaves the previous runtime untouched when the copy fails", () => {
    const { bundlePath, pdfjsRoot, hostDir } = setup();
    stageRuntime({ hostDir, bundlePath, pdfjsRoot, version: "0.1.0" });
    writeFileSync(bundlePath, "// bundle v2\n");
    const diskFull = Object.assign(new Error("ENOSPC: no space left"), { code: "ENOSPC" });

    expect(() =>
      stageRuntime({
        hostDir,
        bundlePath,
        pdfjsRoot,
        version: "0.2.0",
        fs: failingFs("cpSync", 3, diskFull),
      }),
    ).toThrow("ENOSPC");

    const runtime = runtimeDir(hostDir);
    expect(readFileSync(join(runtime, "cv-snap-host.mjs"), "utf8")).toBe("// bundle v1\n");
    expect(existsSync(`${runtime}.new`)).toBe(false);
  });

  it("reports a running host when the old runtime can't be moved, and changes nothing", () => {
    const { bundlePath, pdfjsRoot, hostDir } = setup();
    stageRuntime({ hostDir, bundlePath, pdfjsRoot, version: "0.1.0" });
    writeFileSync(bundlePath, "// bundle v2\n");

    expect(() =>
      stageRuntime({
        hostDir,
        bundlePath,
        pdfjsRoot,
        version: "0.2.0",
        fs: failingFs("renameSync", 1, lockError("EPERM")),
      }),
    ).toThrow(HostInUseError);

    const runtime = runtimeDir(hostDir);
    expect(readFileSync(join(runtime, "cv-snap-host.mjs"), "utf8")).toBe("// bundle v1\n");
    expect(existsSync(`${runtime}.new`)).toBe(false);
    expect(existsSync(`${runtime}.old`)).toBe(false);
  });

  it("puts the old runtime back when the new one can't be moved into place", () => {
    const { bundlePath, pdfjsRoot, hostDir } = setup();
    stageRuntime({ hostDir, bundlePath, pdfjsRoot, version: "0.1.0" });

    expect(() =>
      stageRuntime({
        hostDir,
        bundlePath,
        pdfjsRoot,
        version: "0.2.0",
        fs: failingFs("renameSync", 2, new Error("EIO: i/o error")),
      }),
    ).toThrow("EIO");

    const runtime = runtimeDir(hostDir);
    expect(readFileSync(join(runtime, "package.json"), "utf8")).toContain("0.1.0");
    expect(existsSync(`${runtime}.old`)).toBe(false);
  });

  it("still succeeds when the old runtime can't be deleted after the swap", () => {
    const { bundlePath, pdfjsRoot, hostDir } = setup();
    stageRuntime({ hostDir, bundlePath, pdfjsRoot, version: "0.1.0" });

    // rmSync calls: runtime.new and runtime.old leftovers (2), then the final clean-up (3).
    const { entryPath } = stageRuntime({
      hostDir,
      bundlePath,
      pdfjsRoot,
      version: "0.2.0",
      fs: failingFs("rmSync", 3, lockError()),
    });

    expect(readFileSync(join(runtimeDir(hostDir), "package.json"), "utf8")).toContain("0.2.0");
    expect(existsSync(entryPath)).toBe(true);
  });

  it("repairs an install that stopped between the two renames, even if the new copy then fails", () => {
    const { bundlePath, pdfjsRoot, hostDir } = setup();
    stageRuntime({ hostDir, bundlePath, pdfjsRoot, version: "0.1.0" });
    const runtime = runtimeDir(hostDir);
    nodeFs.renameSync(runtime, `${runtime}.old`); // crash after the first rename

    expect(() =>
      stageRuntime({
        hostDir,
        bundlePath,
        pdfjsRoot,
        version: "0.2.0",
        fs: failingFs("cpSync", 1, new Error("EIO: i/o error")),
      }),
    ).toThrow("EIO");

    expect(readFileSync(join(runtime, "package.json"), "utf8")).toContain("0.1.0");
    expect(existsSync(`${runtime}.old`)).toBe(false);
  });
});

describe("isFileLockError", () => {
  it.each(["EBUSY", "EPERM", "EACCES"])("treats %s as a lock", (code) => {
    expect(isFileLockError(lockError(code))).toBe(true);
  });

  it("ignores other errors", () => {
    expect(isFileLockError(new Error("plain"))).toBe(false);
    expect(isFileLockError(Object.assign(new Error("x"), { code: "ENOENT" }))).toBe(false);
    expect(isFileLockError("EBUSY")).toBe(false);
  });
});

describe("resolvePdfjsRoot", () => {
  it("finds the pdfjs-dist package the host depends on", () => {
    const root = resolvePdfjsRoot(import.meta.url);
    const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as { name: string };

    expect(pkg.name).toBe("pdfjs-dist");
    for (const file of PDFJS_RUNTIME_FILES) expect(existsSync(join(root, file)), file).toBe(true);
  });
});
