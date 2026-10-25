import { describe, expect, it } from "vitest";
import { runProcess } from "./run-process.js";

/** Uses `node -e` as a harmless child process; never the real `claude` CLI. */
const node = (script: string) => ({ command: process.execPath, args: ["-e", script] });

describe("runProcess", () => {
  it("captures stdout, stderr and the exit code", async () => {
    const result = await runProcess({
      ...node("process.stdout.write('out'); process.stderr.write('err'); process.exit(3)"),
      timeoutMs: 10_000,
    });

    expect(result).toMatchObject({ exitCode: 3, stdout: "out", stderr: "err", isTimedOut: false });
  });

  it("passes stdin to the child (large input never goes on argv)", async () => {
    const input = "ż".repeat(100_000);

    const result = await runProcess({
      ...node(
        "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>process.stdout.write(String(s.length)))",
      ),
      stdin: input,
      timeoutMs: 10_000,
    });

    expect(result.stdout).toBe(String(input.length));
  });

  it("reports ENOENT for a program that doesn't exist", async () => {
    const result = await runProcess({
      command: "definitely-not-a-real-program-cvsnap",
      args: [],
      timeoutMs: 5000,
    });

    expect(result.spawnErrorCode).toBe("ENOENT");
  });

  it("kills a child that exceeds the timeout", async () => {
    const startedAt = Date.now();

    const result = await runProcess({ ...node("setInterval(() => {}, 1000)"), timeoutMs: 300 });

    expect(result.isTimedOut).toBe(true);
    expect(Date.now() - startedAt).toBeLessThan(2500);
  });

  it("kills the child within 2 s when aborted", async () => {
    const controller = new AbortController();
    const startedAt = Date.now();
    setTimeout(() => {
      controller.abort();
    }, 200);

    const result = await runProcess({
      ...node("setInterval(() => {}, 1000)"),
      timeoutMs: 30_000,
      signal: controller.signal,
    });

    expect(result.isAborted).toBe(true);
    expect(Date.now() - startedAt).toBeLessThan(2200);
  });

  it("doesn't start anything when the signal is already aborted", async () => {
    const controller = new AbortController();
    controller.abort();

    const result = await runProcess({ ...node(""), timeoutMs: 1000, signal: controller.signal });

    expect(result).toMatchObject({ isAborted: true, exitCode: null });
  });

  it("caps captured output", async () => {
    const result = await runProcess({
      ...node("process.stdout.write('x'.repeat(200000))"),
      timeoutMs: 10_000,
      maxOutputBytes: 1000,
    });

    expect(result.stdout.length).toBeLessThan(200_000);
  });

  it.runIf(process.platform === "win32")(
    "returns a spawn error instead of throwing when argv is too long for Windows",
    async () => {
      const result = await runProcess({ ...node("x".repeat(70_000)), timeoutMs: 5000 });

      expect(result.spawnErrorCode).toBe("ENAMETOOLONG");
    },
  );
});
