import * as nodeFs from "node:fs";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  HostInUseError,
  isFileLockError,
  runtimeDir,
  stageRuntime,
  type RuntimeFs,
} from "./runtime.js";

const dirs: string[] = [];
afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

/** A package `dist/` (bundle + vendored pdf.js) and an empty host dir, in a non-ASCII temp path. */
function setup(bundleText = "// bundle v1\n") {
  const root = mkdtempSync(join(tmpdir(), "cv snap Zażółć "));
  dirs.push(root);
  const sourceDir = join(root, "dist");
  const bundlePath = join(sourceDir, "cv-snap-host.mjs");
  mkdirSync(join(sourceDir, "vendor", "pdfjs-dist", "legacy", "build"), { recursive: true });
  writeFileSync(bundlePath, bundleText);
  writeFileSync(join(sourceDir, "vendor", "pdfjs-dist", "legacy", "build", "pdf.mjs"), "pdf.js");
  return { root, sourceDir, bundlePath, hostDir: join(root, "host") };
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
  it("copies the package's dist (bundle and vendored pdf.js) and records the version", () => {
    const { sourceDir, hostDir } = setup();

    const { entryPath } = stageRuntime({ hostDir, sourceDir, version: "0.1.0" });

    const runtime = runtimeDir(hostDir);
    expect(entryPath).toBe(join(runtime, "cv-snap-host.mjs"));
    expect(readFileSync(entryPath, "utf8")).toBe("// bundle v1\n");
    expect(JSON.parse(readFileSync(join(runtime, "package.json"), "utf8"))).toEqual({
      name: "cv-snap-host-runtime",
      version: "0.1.0",
      type: "module",
    });
    expect(
      readFileSync(join(runtime, "vendor", "pdfjs-dist", "legacy", "build", "pdf.mjs"), "utf8"),
    ).toBe("pdf.js");
    expect(existsSync(`${runtime}.new`)).toBe(false);
    expect(existsSync(`${runtime}.old`)).toBe(false);
  });

  it("keeps working after the source is deleted (npx cache cleared)", () => {
    const { sourceDir, hostDir } = setup();
    const { entryPath } = stageRuntime({ hostDir, sourceDir, version: "0.1.0" });

    rmSync(sourceDir, { recursive: true });

    expect(readFileSync(entryPath, "utf8")).toBe("// bundle v1\n");
  });

  it("upgrades in place", () => {
    const { sourceDir, bundlePath, hostDir } = setup();
    stageRuntime({ hostDir, sourceDir, version: "0.1.0" });
    writeFileSync(join(runtimeDir(hostDir), "stale.txt"), "from 0.1.0");
    writeFileSync(bundlePath, "// bundle v2\n");

    const { entryPath } = stageRuntime({ hostDir, sourceDir, version: "0.2.0" });

    expect(readFileSync(entryPath, "utf8")).toBe("// bundle v2\n");
    expect(existsSync(join(runtimeDir(hostDir), "stale.txt"))).toBe(false);
    expect(readFileSync(join(runtimeDir(hostDir), "package.json"), "utf8")).toContain("0.2.0");
  });

  it("leaves the previous runtime untouched when the copy fails", () => {
    const { sourceDir, bundlePath, hostDir } = setup();
    stageRuntime({ hostDir, sourceDir, version: "0.1.0" });
    writeFileSync(bundlePath, "// bundle v2\n");
    const diskFull = Object.assign(new Error("ENOSPC: no space left"), { code: "ENOSPC" });

    expect(() =>
      stageRuntime({
        hostDir,
        sourceDir,
        version: "0.2.0",
        fs: failingFs("cpSync", 1, diskFull),
      }),
    ).toThrow("ENOSPC");

    const runtime = runtimeDir(hostDir);
    expect(readFileSync(join(runtime, "cv-snap-host.mjs"), "utf8")).toBe("// bundle v1\n");
    expect(existsSync(`${runtime}.new`)).toBe(false);
  });

  it("reports a running host when the old runtime can't be moved, and changes nothing", () => {
    const { sourceDir, bundlePath, hostDir } = setup();
    stageRuntime({ hostDir, sourceDir, version: "0.1.0" });
    writeFileSync(bundlePath, "// bundle v2\n");

    expect(() =>
      stageRuntime({
        hostDir,
        sourceDir,
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
    const { sourceDir, hostDir } = setup();
    stageRuntime({ hostDir, sourceDir, version: "0.1.0" });

    expect(() =>
      stageRuntime({
        hostDir,
        sourceDir,
        version: "0.2.0",
        fs: failingFs("renameSync", 2, new Error("EIO: i/o error")),
      }),
    ).toThrow("EIO");

    const runtime = runtimeDir(hostDir);
    expect(readFileSync(join(runtime, "package.json"), "utf8")).toContain("0.1.0");
    expect(existsSync(`${runtime}.old`)).toBe(false);
  });

  it("still succeeds when the old runtime can't be deleted after the swap", () => {
    const { sourceDir, hostDir } = setup();
    stageRuntime({ hostDir, sourceDir, version: "0.1.0" });

    // rmSync calls: runtime.new and runtime.old leftovers (2), then the final clean-up (3).
    const { entryPath } = stageRuntime({
      hostDir,
      sourceDir,
      version: "0.2.0",
      fs: failingFs("rmSync", 3, lockError()),
    });

    expect(readFileSync(join(runtimeDir(hostDir), "package.json"), "utf8")).toContain("0.2.0");
    expect(existsSync(entryPath)).toBe(true);
  });

  it("repairs an install that stopped between the two renames, even if the new copy then fails", () => {
    const { sourceDir, hostDir } = setup();
    stageRuntime({ hostDir, sourceDir, version: "0.1.0" });
    const runtime = runtimeDir(hostDir);
    nodeFs.renameSync(runtime, `${runtime}.old`); // crash after the first rename

    expect(() =>
      stageRuntime({
        hostDir,
        sourceDir,
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
