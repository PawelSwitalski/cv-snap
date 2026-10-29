import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  allowedExtensionOrigins,
  DEV_EXTENSION_ID,
  EXTENSION_ID_PATTERN,
  EXTENSION_PUBLIC_KEY,
  isStoreIdSet,
  originOf,
  STORE_EXTENSION_ID,
} from "./extension-identity.js";

/** Chrome's rule: SHA-256 of the DER public key, first 32 hex digits, 0–f mapped to a–p. */
function extensionIdFromKey(base64Key: string): string {
  const hex = createHash("sha256").update(Buffer.from(base64Key, "base64")).digest("hex");
  return Array.from(hex.slice(0, 32))
    .map((digit) => String.fromCharCode(97 + parseInt(digit, 16)))
    .join("");
}

const SOME_STORE_ID = "abcdefghijklmnopabcdefghijklmnop";

describe("extension identity", () => {
  it("derives DEV_EXTENSION_ID from EXTENSION_PUBLIC_KEY", () => {
    expect(extensionIdFromKey(EXTENSION_PUBLIC_KEY)).toBe(DEV_EXTENSION_ID);
  });

  it("builds origins in the form allowed_origins expects", () => {
    expect(originOf(DEV_EXTENSION_ID)).toBe(`chrome-extension://${DEV_EXTENSION_ID}/`);
  });

  it("allows only the dev build while the store ID is unknown", () => {
    expect(isStoreIdSet("")).toBe(false);
    expect(allowedExtensionOrigins("")).toEqual([originOf(DEV_EXTENSION_ID)]);
  });

  it("allows exactly the dev and the store build once the store ID is set", () => {
    expect(allowedExtensionOrigins(SOME_STORE_ID)).toEqual([
      originOf(DEV_EXTENSION_ID),
      originOf(SOME_STORE_ID),
    ]);
  });

  it("accepts a configured store ID only if it is a real extension ID, distinct from dev", () => {
    if (!isStoreIdSet()) return;
    expect(STORE_EXTENSION_ID).toMatch(EXTENSION_ID_PATTERN);
    expect(STORE_EXTENSION_ID).not.toBe(DEV_EXTENSION_ID);
  });
});
