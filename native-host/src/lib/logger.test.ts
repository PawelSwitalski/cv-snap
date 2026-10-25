import { describe, expect, it } from "vitest";
import { createLogger } from "./logger.js";

describe("createLogger", () => {
  it("writes one JSON line with level, message and fields", () => {
    const lines: string[] = [];
    const logger = createLogger("info", (line) => lines.push(line));

    logger.info("generation finished", { requestId: "r1", durationMs: 1200 });

    expect(lines).toHaveLength(1);
    expect(JSON.parse(lines[0] ?? "")).toMatchObject({
      level: "info",
      message: "generation finished",
      requestId: "r1",
      durationMs: 1200,
    });
  });

  it("drops messages below the minimum level", () => {
    const lines: string[] = [];
    const logger = createLogger("warn", (line) => lines.push(line));

    logger.debug("d");
    logger.info("i");
    logger.warn("w");
    logger.error("e");

    expect(lines.map((line) => (JSON.parse(line) as { level: string }).level)).toEqual([
      "warn",
      "error",
    ]);
  });

  it("writes to stderr by default, never stdout", () => {
    const stdoutWrite = process.stdout.write.bind(process.stdout);
    const stderrWrite = process.stderr.write.bind(process.stderr);
    let stdoutBytes = 0;
    let stderrBytes = 0;
    process.stdout.write = (chunk: string | Uint8Array) => {
      stdoutBytes += chunk.length;
      return true;
    };
    process.stderr.write = (chunk: string | Uint8Array) => {
      stderrBytes += chunk.length;
      return true;
    };
    try {
      createLogger("debug").error("boom", { code: "GENERATION_FAILED" });
    } finally {
      process.stdout.write = stdoutWrite;
      process.stderr.write = stderrWrite;
    }

    expect(stdoutBytes).toBe(0);
    expect(stderrBytes).toBeGreaterThan(0);
  });
});
