import { describe, expect, it } from "vitest";
import { loadFixture } from "../test/fixtures.js";
import { JobRequirementsSchema } from "./job-requirements.js";
import {
  CACHE_MAX_ENTRIES,
  CACHE_TTL_MS,
  isFresh,
  pruneEntries,
  RequirementsCacheSchema,
  type RequirementsCacheEntry,
} from "./requirements-cache.js";

const NOW = new Date("2026-10-27T12:00:00Z");
const requirements = () => JobRequirementsSchema.parse(loadFixture("requirements"));
const entry = (ageMs: number): RequirementsCacheEntry => ({
  requirements: requirements(),
  parsedAt: new Date(NOW.getTime() - ageMs).toISOString(),
});

describe("isFresh", () => {
  it("is fresh until exactly 7 days after parsing", () => {
    expect(CACHE_TTL_MS).toBe(7 * 24 * 60 * 60 * 1000);
    expect(isFresh(entry(0), NOW)).toBe(true);
    expect(isFresh(entry(CACHE_TTL_MS - 1), NOW)).toBe(true);
    expect(isFresh(entry(CACHE_TTL_MS), NOW)).toBe(false);
  });

  it("treats an unreadable timestamp as stale", () => {
    expect(isFresh({ requirements: requirements(), parsedAt: "yesterday" }, NOW)).toBe(false);
  });
});

describe("pruneEntries", () => {
  it("drops stale entries", () => {
    const pruned = pruneEntries({ fresh: entry(1000), stale: entry(CACHE_TTL_MS + 1) }, NOW);

    expect(Object.keys(pruned)).toEqual(["fresh"]);
  });

  it("keeps only the newest entries above the cap", () => {
    const entries = Object.fromEntries(
      Array.from({ length: CACHE_MAX_ENTRIES + 5 }, (_, index) => [
        `k${String(index)}`,
        entry(index * 1000),
      ]),
    );

    const pruned = pruneEntries(entries, NOW);

    expect(CACHE_MAX_ENTRIES).toBe(300);
    expect(Object.keys(pruned)).toHaveLength(300);
    expect(pruned.k0).toBeDefined();
    expect(pruned.k304).toBeUndefined();
  });

  it("honours a custom cap", () => {
    expect(Object.keys(pruneEntries({ a: entry(1), b: entry(2), c: entry(3) }, NOW, 2))).toEqual([
      "a",
      "b",
    ]);
  });
});

describe("RequirementsCacheSchema", () => {
  it("accepts parsed requirements and rejects anything else in an entry", () => {
    const valid = { schemaVersion: 1, entries: { k: entry(0) } };
    const withAdText = { schemaVersion: 1, entries: { k: { ...entry(0), adText: "raw ad" } } };

    expect(RequirementsCacheSchema.safeParse(valid).success).toBe(true);
    // Unknown keys are stripped: raw ad text can never be read back from storage.
    expect(RequirementsCacheSchema.parse(withAdText).entries.k).not.toHaveProperty("adText");
    expect(RequirementsCacheSchema.safeParse({ schemaVersion: 2, entries: {} }).success).toBe(
      false,
    );
  });
});
