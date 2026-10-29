import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createLogger, createRotatingFileSink, teeSinks } from "./logger.js";
import { appDataDir, hostInstallDir, logDir } from "./paths.js";

const dirs: string[] = [];
const tempDir = () => {
  const dir = mkdtempSync(join(tmpdir(), "cvsnap-log-"));
  dirs.push(dir);
  return dir;
};
afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe("createRotatingFileSink", () => {
  it("appends JSON lines to host.log, creating the directory", () => {
    const directory = join(tempDir(), "nested", "logs");
    const logger = createLogger("info", createRotatingFileSink({ directory }));

    logger.info("one");
    logger.info("two");

    const lines = readFileSync(join(directory, "host.log"), "utf8").trim().split("\n");
    expect(lines.map((line) => (JSON.parse(line) as { message: string }).message)).toEqual([
      "one",
      "two",
    ]);
  });

  it("rotates at maxBytes and keeps at most maxFiles old files", () => {
    const directory = tempDir();
    const sink = createRotatingFileSink({ directory, maxBytes: 100, maxFiles: 2 });

    for (let i = 0; i < 40; i++) sink(`line ${String(i)} ${"x".repeat(30)}`);

    expect(readdirSync(directory).sort()).toEqual(["host.1.log", "host.2.log", "host.log"]);
    expect(readFileSync(join(directory, "host.log"), "utf8")).toContain("line 39");
  });

  it("never throws when the log directory can't be created", () => {
    const blocker = join(tempDir(), "a-file");
    writeFileSync(blocker, "not a directory");
    const sink = createRotatingFileSink({ directory: join(blocker, "logs") });

    expect(() => {
      sink("first");
      sink("second");
    }).not.toThrow();
  });
});

describe("teeSinks", () => {
  it("writes each line to every sink", () => {
    const a: string[] = [];
    const b: string[] = [];

    teeSinks(
      (line) => a.push(line),
      (line) => b.push(line),
    )("hello");

    expect([a, b]).toEqual([["hello"], ["hello"]]);
  });
});

describe("paths", () => {
  it("keeps all cv-snap data under %LOCALAPPDATA%\\cv-snap", () => {
    const context = {
      platform: "win32" as const,
      env: { LOCALAPPDATA: "C:\\Users\\jan\\AppData\\Local" },
      home: "C:\\Users\\jan",
    };

    expect(appDataDir(context)).toBe("C:\\Users\\jan\\AppData\\Local\\cv-snap");
    expect(logDir(context)).toBe("C:\\Users\\jan\\AppData\\Local\\cv-snap\\logs");
    expect(hostInstallDir(context)).toBe("C:\\Users\\jan\\AppData\\Local\\cv-snap\\host");
  });
});
