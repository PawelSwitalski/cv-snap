import { describe, expect, it } from "vitest";
import { createMemoryStore, STORAGE_KEYS } from "@/lib/storage/local-store";
import {
  acknowledgeNotice,
  isNoticeAcknowledged,
  PRIVACY_NOTICE_VERSION,
  readAcknowledgedNoticeVersion,
} from "./privacy-notice";

describe("privacy notice acknowledgement", () => {
  it("is not acknowledged on first run", async () => {
    const version = await readAcknowledgedNoticeVersion(createMemoryStore());

    expect(version).toBe(0);
    expect(isNoticeAcknowledged(version)).toBe(false);
  });

  it("stores the current version and is then acknowledged", async () => {
    const store = createMemoryStore();

    await acknowledgeNotice(store);

    expect(store.data.get(STORAGE_KEYS.privacyNoticeVersion)).toBe(PRIVACY_NOTICE_VERSION);
    expect(isNoticeAcknowledged(await readAcknowledgedNoticeVersion(store))).toBe(true);
  });

  it("asks again when the notice version changed", () => {
    expect(isNoticeAcknowledged(PRIVACY_NOTICE_VERSION - 1)).toBe(false);
  });

  it.each(["1", 1.5, null, { version: 1 }])(
    "treats a malformed stored value %j as not acknowledged",
    async (value) => {
      const store = createMemoryStore({ [STORAGE_KEYS.privacyNoticeVersion]: value });

      expect(await readAcknowledgedNoticeVersion(store)).toBe(0);
    },
  );
});
