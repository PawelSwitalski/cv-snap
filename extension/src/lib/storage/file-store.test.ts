// @vitest-environment node
// happy-dom Blobs do not survive fake-indexeddb cloning; Chrome stores Blobs natively.
import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { FILE_KEYS, indexedDbFileStore } from "./file-store";

describe("indexedDbFileStore", () => {
  it("stores, reads back and deletes a file in IndexedDB", async () => {
    const pdf = new Blob([new Uint8Array([0x25, 0x50, 0x44, 0x46])], { type: "application/pdf" });

    await indexedDbFileStore.set(FILE_KEYS.cvOriginal, pdf);
    const stored = await indexedDbFileStore.get(FILE_KEYS.cvOriginal);

    expect(stored?.size).toBe(4);
    await indexedDbFileStore.delete(FILE_KEYS.cvOriginal);
    expect(await indexedDbFileStore.get(FILE_KEYS.cvOriginal)).toBeUndefined();
  });
});
