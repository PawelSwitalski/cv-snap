import { PassThrough } from "node:stream";
import { CvSnapError, MAX_OUTBOUND_MESSAGE_BYTES, type HostFrame } from "@cv-snap/shared";
import { describe, expect, it } from "vitest";
import { frame, parseFrames } from "../../test/frames.js";
import { createLogger } from "../lib/logger.js";
import { runHost, UNKNOWN_REQUEST_ID, type RequestHandlers } from "./host.js";

const HEALTHY = {
  hostVersion: "0.1.0",
  claudeFound: true,
  claudeVersion: "2.1.302",
  isAuthenticated: true,
  isVersionSupported: true,
};

/** Runs the host in-process on fake stdio and collects everything it writes. */
function startHost(handlers: RequestHandlers = {}) {
  const input = new PassThrough();
  const output = new PassThrough();
  const written: Buffer[] = [];
  output.on("data", (chunk: Buffer) => written.push(chunk));
  const logLines: string[] = [];
  const done = runHost({
    input,
    output,
    handlers,
    logger: createLogger("debug", (line) => logLines.push(line)),
  });
  const frames = () => parseFrames(Buffer.concat(written));
  return {
    send: (value: unknown) => input.write(frame(value)),
    sendRaw: (bytes: Buffer) => input.write(bytes),
    frames,
    responses: () => frames().filter((f) => f.type === "response"),
    /** Waits until `count` frames have been written (or fails after 2 s). */
    waitFor: async (count: number) => {
      const deadline = Date.now() + 2000;
      while (frames().length < count) {
        if (Date.now() > deadline) throw new Error(`only ${String(frames().length)} frames`);
        await new Promise((resolve) => setTimeout(resolve, 5));
      }
      return frames();
    },
    close: async () => {
      input.end();
      await done;
    },
    logLines,
  };
}

const errorOf = (f: HostFrame | undefined) =>
  f?.type === "response" && !f.response.ok ? f.response.error : undefined;

describe("runHost", () => {
  it("answers a valid request through its handler", async () => {
    const host = startHost({ health: () => Promise.resolve(HEALTHY) });

    host.send({ type: "health", requestId: "h1" });

    const [reply] = await host.waitFor(1);
    expect(reply).toEqual({
      type: "response",
      requestId: "h1",
      response: { ok: true, data: HEALTHY },
    });
    await host.close();
  });

  it("replies INVALID_MESSAGE with the requestId when validation fails", async () => {
    const host = startHost();

    host.send({ type: "tailor", requestId: "t1" });

    const [reply] = await host.waitFor(1);
    expect(reply?.requestId).toBe("t1");
    expect(errorOf(reply)?.code).toBe("INVALID_MESSAGE");
    await host.close();
  });

  it("replies INVALID_MESSAGE for an unknown type and to the unknown id when none is readable", async () => {
    const host = startHost();

    host.send({ type: "format-disk", requestId: "x1" });
    host.send(["not", "an", "object"]);

    const [first, second] = await host.waitFor(2);
    expect(errorOf(first)?.code).toBe("INVALID_MESSAGE");
    expect(second?.requestId).toBe(UNKNOWN_REQUEST_ID);
    await host.close();
  });

  it("replies that a type without a handler is not supported yet", async () => {
    const host = startHost();

    host.send({ type: "extractPdfText", requestId: "p1", pdfBase64: "JVBERi0x" });

    const [reply] = await host.waitFor(1);
    expect(errorOf(reply)).toMatchObject({ code: "INVALID_MESSAGE" });
    expect(errorOf(reply)?.message).toContain("not supported by this host version");
    await host.close();
  });

  it("sends progress frames with the requestId before the final reply", async () => {
    const host = startHost({
      health: async (_request, { progress }) => {
        progress("parsing-requirements");
        await Promise.resolve();
        progress("tailoring");
        return HEALTHY;
      },
    });

    host.send({ type: "health", requestId: "h1" });

    const frames = await host.waitFor(3);
    expect(frames.map((f) => f.type)).toEqual(["progress", "progress", "response"]);
    expect(frames.every((f) => f.requestId === "h1")).toBe(true);
    await host.close();
  });

  it("aborts a running request on cancel and replies CANCELLED", async () => {
    let wasAborted = false;
    const host = startHost({
      health: (_request, { signal }) =>
        new Promise((_resolve, reject) => {
          signal.addEventListener("abort", () => {
            wasAborted = true;
            reject(new Error("aborted"));
          });
        }),
    });

    host.send({ type: "health", requestId: "h1" });
    host.send({ type: "cancel", requestId: "h1" });

    const [reply] = await host.waitFor(1);
    expect(wasAborted).toBe(true);
    expect(errorOf(reply)?.code).toBe("CANCELLED");
    await host.close();
  });

  it("replies CANCELLED even if the handler resolves after the abort", async () => {
    const host = startHost({
      health: async (_request, { signal }) => {
        await new Promise((resolve) => {
          signal.addEventListener("abort", resolve);
        });
        return HEALTHY;
      },
    });

    host.send({ type: "health", requestId: "h1" });
    host.send({ type: "cancel", requestId: "h1" });

    expect(errorOf((await host.waitFor(1))[0])?.code).toBe("CANCELLED");
    await host.close();
  });

  it("ignores a cancel for an unknown request", async () => {
    const host = startHost();

    host.send({ type: "cancel", requestId: "nope" });
    await host.close();

    expect(host.frames()).toEqual([]);
  });

  it("rejects a second request reusing a running requestId", async () => {
    let release: () => void = () => {
      // replaced once the handler is running
    };
    const host = startHost({
      health: () =>
        new Promise((resolve) => {
          release = () => {
            resolve(HEALTHY);
          };
        }),
    });

    host.send({ type: "health", requestId: "h1" });
    host.send({ type: "health", requestId: "h1" });
    const [duplicate] = await host.waitFor(1);
    release();

    expect(errorOf(duplicate)?.message).toContain("already in use");
    await host.waitFor(2);
    await host.close();
  });

  it("passes CvSnapError details through and hides unknown errors", async () => {
    const host = startHost({
      health: (request) =>
        Promise.reject(
          request.requestId === "typed"
            ? new CvSnapError("CLAUDE_NOT_FOUND", "Claude Code not found")
            : new Error("internal detail with CV text"),
        ),
    });

    host.send({ type: "health", requestId: "typed" });
    host.send({ type: "health", requestId: "other" });

    const frames = await host.waitFor(2);
    const byId = new Map(frames.map((f) => [f.requestId, errorOf(f)]));
    expect(byId.get("typed")).toEqual({
      code: "CLAUDE_NOT_FOUND",
      message: "Claude Code not found",
    });
    expect(byId.get("other")).toEqual({ code: "GENERATION_FAILED", message: "Unexpected error" });
    await host.close();
  });

  it("replaces a reply of 1 MB or more with MESSAGE_TOO_LARGE", async () => {
    const host = startHost({
      health: () =>
        Promise.resolve({ ...HEALTHY, hostVersion: "x".repeat(MAX_OUTBOUND_MESSAGE_BYTES) }),
    });

    host.send({ type: "health", requestId: "h1" });

    const [reply] = await host.waitFor(1);
    expect(errorOf(reply)?.code).toBe("MESSAGE_TOO_LARGE");
    expect(reply?.requestId).toBe("h1");
    await host.close();
  });

  it("replies MESSAGE_TOO_LARGE for an inbound frame over 64 MB without crashing", async () => {
    const host = startHost({ health: () => Promise.resolve(HEALTHY) });
    const header = Buffer.alloc(4);
    header.writeUInt32LE(64 * 1024 * 1024 + 1, 0);

    host.sendRaw(header);

    const [reply] = await host.waitFor(1);
    expect(errorOf(reply)?.code).toBe("MESSAGE_TOO_LARGE");
    await host.close();
  });

  it("aborts running work and resolves when the input closes", async () => {
    let wasAborted = false;
    const host = startHost({
      health: (_request, { signal }) =>
        new Promise((_resolve, reject) => {
          signal.addEventListener("abort", () => {
            wasAborted = true;
            reject(new Error("aborted"));
          });
        }),
    });

    host.send({ type: "health", requestId: "h1" });
    await new Promise((resolve) => setTimeout(resolve, 10));
    await host.close();

    expect(wasAborted).toBe(true);
    expect(host.frames()).toEqual([]); // nothing is written after the extension went away
  });

  it("never logs request payloads", async () => {
    const host = startHost();

    host.send({
      type: "createProfile",
      requestId: "c1",
      model: "claude-haiku-5-5",
      cvText: "Jan Testowy",
    });
    await host.waitFor(1);
    await host.close();

    expect(host.logLines.join("\n")).not.toContain("Jan Testowy");
  });
});

describe("runHost fuzzing", () => {
  /** Deterministic PRNG so failures are reproducible. */
  function random(seed: number) {
    let state = seed;
    return () => {
      state = (state * 1103515245 + 12345) & 0x7fffffff;
      return state / 0x7fffffff;
    };
  }

  it("survives random bytes and still writes only valid frames", async () => {
    for (let seed = 1; seed <= 30; seed++) {
      const next = random(seed);
      const host = startHost({ health: () => Promise.resolve(HEALTHY) });
      for (let i = 0; i < 20; i++) {
        const bytes = Buffer.alloc(Math.floor(next() * 64));
        for (let b = 0; b < bytes.length; b++) bytes[b] = Math.floor(next() * 256);
        host.sendRaw(bytes);
      }

      await host.close();

      expect(() => host.frames()).not.toThrow();
    }
  });

  it("answers every valid request when frames are split at random boundaries", async () => {
    for (let seed = 1; seed <= 30; seed++) {
      const next = random(seed);
      const host = startHost({ health: () => Promise.resolve(HEALTHY) });
      const ids = Array.from({ length: 10 }, (_, i) => `r${String(i)}`);
      const stream = Buffer.concat(ids.map((requestId) => frame({ type: "health", requestId })));
      let offset = 0;
      while (offset < stream.length) {
        const size = 1 + Math.floor(next() * 40);
        host.sendRaw(stream.subarray(offset, offset + size));
        offset += size;
      }

      const frames = await host.waitFor(ids.length);

      expect(frames.map((f) => f.requestId).sort()).toEqual([...ids].sort());
      await host.close();
    }
  });
});
