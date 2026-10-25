import type { HostFrame } from "@cv-snap/shared";

/** Test helpers for native-messaging frames (4-byte little-endian length + JSON). */

export function frame(value: unknown): Buffer {
  const json = Buffer.from(JSON.stringify(value), "utf8");
  const header = Buffer.alloc(4);
  header.writeUInt32LE(json.length, 0);
  return Buffer.concat([header, json]);
}

/**
 * Splits a byte stream into frames. Throws if any byte is not part of a complete frame, so tests
 * prove that stdout carried protocol frames and nothing else.
 */
export function parseFrames(bytes: Buffer): HostFrame[] {
  const frames: HostFrame[] = [];
  let offset = 0;
  while (offset < bytes.length) {
    if (offset + 4 > bytes.length) throw new Error(`stray bytes at offset ${String(offset)}`);
    const length = bytes.readUInt32LE(offset);
    const end = offset + 4 + length;
    if (end > bytes.length) throw new Error(`truncated frame at offset ${String(offset)}`);
    frames.push(JSON.parse(bytes.subarray(offset + 4, end).toString("utf8")) as HostFrame);
    offset = end;
  }
  return frames;
}
