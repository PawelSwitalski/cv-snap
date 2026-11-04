import { describe, expect, it } from "vitest";
import { createMemoryStore, STORAGE_KEYS } from "@/lib/storage/local-store";
import { readHistoryOnly, setHistoryOnly } from "./history-only";

describe("history-only flag", () => {
  it("is off until set, and off again once cleared", async () => {
    const store = createMemoryStore();
    expect(await readHistoryOnly(store)).toBe(false);

    await setHistoryOnly(store, true);
    expect(await readHistoryOnly(store)).toBe(true);

    await setHistoryOnly(store, false);
    expect(await readHistoryOnly(store)).toBe(false);
    expect(await store.get(STORAGE_KEYS.historyOnly)).toBeUndefined();
  });

  it.each([["yes"], [1], [{}], [null]])("reads %j as off", async (value) => {
    expect(await readHistoryOnly(createMemoryStore({ [STORAGE_KEYS.historyOnly]: value }))).toBe(
      false,
    );
  });
});
