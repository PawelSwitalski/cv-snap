import { MAX_INBOUND_MESSAGE_BYTES, type ErrorPayload } from "@cv-snap/shared";

/**
 * Chrome native-messaging framing: a 4-byte little-endian length, then that many bytes of UTF-8
 * JSON (https://developer.chrome.com/docs/extensions/develop/concepts/native-messaging).
 */
const HEADER_BYTES = 4;

export type DecodedFrame =
  { kind: "message"; value: unknown } | { kind: "error"; error: ErrorPayload };

/**
 * Incremental decoder: feed it stdin chunks of any size; it buffers partial frames and returns
 * every frame completed so far. It never throws. An oversized frame is reported and its bytes are
 * skipped, so framing stays in sync and later frames are still read.
 */
export class FrameDecoder {
  private buffer: Buffer = Buffer.alloc(0);
  private bytesToSkip = 0;

  constructor(private readonly maxMessageBytes: number = MAX_INBOUND_MESSAGE_BYTES) {}

  push(chunk: Buffer): DecodedFrame[] {
    this.buffer = this.buffer.length === 0 ? chunk : Buffer.concat([this.buffer, chunk]);
    const frames: DecodedFrame[] = [];
    for (;;) {
      if (this.bytesToSkip > 0) {
        const skipped = Math.min(this.bytesToSkip, this.buffer.length);
        this.buffer = this.buffer.subarray(skipped);
        this.bytesToSkip -= skipped;
        if (this.bytesToSkip > 0) return frames;
      }
      if (this.buffer.length < HEADER_BYTES) return frames;
      const length = this.buffer.readUInt32LE(0);
      if (length > this.maxMessageBytes) {
        frames.push({
          kind: "error",
          error: {
            code: "MESSAGE_TOO_LARGE",
            message: `Message of ${String(length)} bytes exceeds the ${String(this.maxMessageBytes)}-byte limit`,
          },
        });
        this.buffer = this.buffer.subarray(HEADER_BYTES);
        this.bytesToSkip = length;
        continue;
      }
      if (this.buffer.length < HEADER_BYTES + length) return frames;
      const body = this.buffer.subarray(HEADER_BYTES, HEADER_BYTES + length);
      this.buffer = this.buffer.subarray(HEADER_BYTES + length);
      frames.push(decodeBody(body));
    }
  }

  /** Bytes of an incomplete frame still waiting for more input. */
  get pendingBytes(): number {
    return this.buffer.length;
  }
}

function decodeBody(body: Buffer): DecodedFrame {
  try {
    return { kind: "message", value: JSON.parse(body.toString("utf8")) as unknown };
  } catch {
    return {
      kind: "error",
      error: { code: "INVALID_MESSAGE", message: "Frame is not valid JSON" },
    };
  }
}

/** Encodes one message as a frame. Returns the JSON byte length too, for the outbound size limit. */
export function encodeFrame(value: unknown): { frame: Buffer; jsonBytes: number } {
  const json = Buffer.from(JSON.stringify(value), "utf8");
  const header = Buffer.alloc(HEADER_BYTES);
  header.writeUInt32LE(json.length, 0);
  return { frame: Buffer.concat([header, json]), jsonBytes: json.length };
}
