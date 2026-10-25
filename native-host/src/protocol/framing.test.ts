import { describe, expect, it } from "vitest";
import { frame } from "../../test/frames.js";
import { encodeFrame, FrameDecoder, type DecodedFrame } from "./framing.js";

const messages = (frames: DecodedFrame[]) =>
  frames.filter((f) => f.kind === "message").map((f) => f.value);

describe("FrameDecoder", () => {
  it("decodes a frame produced by encodeFrame", () => {
    const value = { type: "health", requestId: "r1" };

    const frames = new FrameDecoder().push(encodeFrame(value).frame);

    expect(frames).toEqual([{ kind: "message", value }]);
  });

  it("decodes several frames delivered in one chunk", () => {
    const chunk = Buffer.concat([frame({ n: 1 }), frame({ n: 2 }), frame({ n: 3 })]);

    expect(messages(new FrameDecoder().push(chunk))).toEqual([{ n: 1 }, { n: 2 }, { n: 3 }]);
  });

  it("buffers a frame split at every possible byte boundary", () => {
    const bytes = frame({ text: "Zażółć gęślą jaźń", requestId: "r1" });
    for (let split = 1; split < bytes.length; split++) {
      const decoder = new FrameDecoder();

      const first = decoder.push(bytes.subarray(0, split));
      const second = decoder.push(bytes.subarray(split));

      expect(first).toEqual([]);
      expect(messages(second)).toEqual([{ text: "Zażółć gęślą jaźń", requestId: "r1" }]);
      expect(decoder.pendingBytes).toBe(0);
    }
  });

  it("decodes a stream fed one byte at a time", () => {
    const bytes = Buffer.concat([frame({ a: 1 }), frame({ b: 2 })]);
    const decoder = new FrameDecoder();
    const out: DecodedFrame[] = [];

    for (const byte of bytes) out.push(...decoder.push(Buffer.from([byte])));

    expect(messages(out)).toEqual([{ a: 1 }, { b: 2 }]);
  });

  it("reports an oversized frame, skips its bytes and keeps decoding", () => {
    const decoder = new FrameDecoder(10);
    const big = frame({ tooLong: "x".repeat(20) });

    const frames = decoder.push(Buffer.concat([big, frame({ ok: 1 })]));

    expect(frames[0]).toMatchObject({ kind: "error", error: { code: "MESSAGE_TOO_LARGE" } });
    expect(messages(frames)).toEqual([{ ok: 1 }]);
  });

  it("skips an oversized frame whose body arrives over several chunks", () => {
    const decoder = new FrameDecoder(10);
    const big = frame({ tooLong: "x".repeat(40) });
    const next = frame({ ok: 1 });

    const out = [
      ...decoder.push(big.subarray(0, 6)),
      ...decoder.push(big.subarray(6, 30)),
      ...decoder.push(Buffer.concat([big.subarray(30), next])),
    ];

    expect(out.filter((f) => f.kind === "error")).toHaveLength(1);
    expect(messages(out)).toEqual([{ ok: 1 }]);
  });

  it("reports INVALID_MESSAGE for a body that is not JSON and continues", () => {
    const body = Buffer.from("{not json", "utf8");
    const header = Buffer.alloc(4);
    header.writeUInt32LE(body.length, 0);

    const frames = new FrameDecoder().push(Buffer.concat([header, body, frame({ ok: 1 })]));

    expect(frames[0]).toMatchObject({ kind: "error", error: { code: "INVALID_MESSAGE" } });
    expect(messages(frames)).toEqual([{ ok: 1 }]);
  });
});

describe("encodeFrame", () => {
  it("prefixes the UTF-8 byte length (not the character count) in little-endian", () => {
    const { frame: bytes, jsonBytes } = encodeFrame({ t: "ż" });

    expect(jsonBytes).toBe(Buffer.byteLength('{"t":"ż"}'));
    expect(bytes.readUInt32LE(0)).toBe(jsonBytes);
  });
});
