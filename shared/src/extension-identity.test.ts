import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { EXTENSION_ID, EXTENSION_ORIGIN, EXTENSION_PUBLIC_KEY } from "./extension-identity.js";

/** Chrome's rule: SHA-256 of the DER public key, first 32 hex digits, 0–f mapped to a–p. */
function extensionIdFromKey(base64Key: string): string {
  const hex = createHash("sha256").update(Buffer.from(base64Key, "base64")).digest("hex");
  return Array.from(hex.slice(0, 32))
    .map((digit) => String.fromCharCode(97 + parseInt(digit, 16)))
    .join("");
}

describe("extension identity", () => {
  it("derives EXTENSION_ID from EXTENSION_PUBLIC_KEY", () => {
    expect(extensionIdFromKey(EXTENSION_PUBLIC_KEY)).toBe(EXTENSION_ID);
  });

  it("builds the origin used in the host manifest's allowed_origins", () => {
    expect(EXTENSION_ORIGIN).toBe(`chrome-extension://${EXTENSION_ID}/`);
  });
});
