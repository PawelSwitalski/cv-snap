import { CACHE_MAX_ENTRIES } from "@cv-snap/shared";
import { describe, expect, it } from "vitest";
import { smallRequirements } from "../../../test/tailoring-fixtures";
import {
  ChromeStorageRequirementsCache,
  REQUIREMENTS_CACHE_KEY,
  type KeyValueStorage,
} from "./requirements-cache-store";

const NOW = new Date("2026-10-27T12:00:00Z");
const DAY = 24 * 60 * 60 * 1000;

function fakeStorage(initial: Record<string, unknown> = {}) {
  const data: Record<string, unknown> = structuredClone(initial);
  const storage: KeyValueStorage = {
    get: (key) => Promise.resolve(key in data ? { [key]: structuredClone(data[key]) } : {}),
    set: (items) => {
      Object.assign(data, structuredClone(items));
      return Promise.resolve();
    },
  };
  return { storage, data };
}

const entryAt = (time: Date) => ({
  requirements: smallRequirements(),
  parsedAt: time.toISOString(),
});

describe("ChromeStorageRequirementsCache", () => {
  it("stores parsed requirements under one key and reads a fresh entry back", async () => {
    const { storage, data } = fakeStorage();
    const cache = new ChromeStorageRequirementsCache(storage);

    await cache.put("https://example.com/job/1", entryAt(NOW), NOW);

    expect(Object.keys(data)).toEqual([REQUIREMENTS_CACHE_KEY]);
    expect(
      await cache.get("https://example.com/job/1", new Date(NOW.getTime() + DAY)),
    ).toMatchObject({
      requirements: { title: "Senior Frontend Developer" },
    });
  });

  it("doesn't serve an entry older than 7 days", async () => {
    const cache = new ChromeStorageRequirementsCache(fakeStorage().storage);
    await cache.put("k", entryAt(NOW), NOW);

    expect(await cache.get("k", new Date(NOW.getTime() + 7 * DAY))).toBeNull();
  });

  it("prunes stale and excess entries on write", async () => {
    const { storage, data } = fakeStorage();
    const cache = new ChromeStorageRequirementsCache(storage);
    await cache.put("old", entryAt(new Date(NOW.getTime() - 8 * DAY)), NOW);
    for (let index = 0; index < CACHE_MAX_ENTRIES + 3; index++) {
      await cache.put(`k${String(index)}`, entryAt(new Date(NOW.getTime() - index)), NOW);
    }

    const stored = data[REQUIREMENTS_CACHE_KEY] as { entries: Record<string, unknown> };

    expect(Object.keys(stored.entries)).toHaveLength(CACHE_MAX_ENTRIES);
    expect(stored.entries.old).toBeUndefined();
  });

  it.each([
    ["garbage", "not an object"],
    ["an old schema version", { schemaVersion: 0, entries: {} }],
    ["an invalid entry", { schemaVersion: 1, entries: { k: { requirements: { title: 1 } } } }],
  ])("drops %s and starts empty", async (_label, stored) => {
    const { storage } = fakeStorage({ [REQUIREMENTS_CACHE_KEY]: stored });
    const cache = new ChromeStorageRequirementsCache(storage);

    expect(await cache.get("k", NOW)).toBeNull();
    await cache.put("k", entryAt(NOW), NOW);
    expect(await cache.get("k", NOW)).not.toBeNull();
  });
});
