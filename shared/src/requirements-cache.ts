import { z } from "zod";
import { JobRequirementsSchema } from "./job-requirements.js";

/** Parsed requirements are reused for 7 days per ad (FR-9). */
export const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
/** The cache keeps at most this many entries (ddd-01: "a few hundred"). */
export const CACHE_MAX_ENTRIES = 300;
export const REQUIREMENTS_CACHE_SCHEMA_VERSION = 1;

export const RequirementsCacheEntrySchema = z.object({
  requirements: JobRequirementsSchema,
  parsedAt: z.iso.datetime(),
});

/** Stored shape (one chrome.storage.local key). Holds parsed requirements only, never ad text. */
export const RequirementsCacheSchema = z.object({
  schemaVersion: z.literal(REQUIREMENTS_CACHE_SCHEMA_VERSION),
  entries: z.record(z.string(), RequirementsCacheEntrySchema),
});

export type RequirementsCacheEntry = z.infer<typeof RequirementsCacheEntrySchema>;
export type RequirementsCache = z.infer<typeof RequirementsCacheSchema>;

/** Fresh while `now < parsedAt + 7 days`; a stale entry is never served. */
export function isFresh(entry: RequirementsCacheEntry, now: Date): boolean {
  const parsedAt = Date.parse(entry.parsedAt);
  return Number.isFinite(parsedAt) && now.getTime() < parsedAt + CACHE_TTL_MS;
}

/** Drops stale entries, then keeps the newest `max` (by `parsedAt`). */
export function pruneEntries(
  entries: Record<string, RequirementsCacheEntry>,
  now: Date,
  max: number = CACHE_MAX_ENTRIES,
): Record<string, RequirementsCacheEntry> {
  const fresh = Object.entries(entries).filter(([, entry]) => isFresh(entry, now));
  fresh.sort(([, a], [, b]) => Date.parse(b.parsedAt) - Date.parse(a.parsedAt));
  return Object.fromEntries(fresh.slice(0, max));
}
