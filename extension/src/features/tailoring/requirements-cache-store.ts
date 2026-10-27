import {
  isFresh,
  pruneEntries,
  REQUIREMENTS_CACHE_SCHEMA_VERSION,
  RequirementsCacheSchema,
  type AdKey,
  type RequirementsCache,
  type RequirementsCacheEntry,
} from "@cv-snap/shared";
import type { RequirementsCacheRepository } from "./ports";

/** chrome.storage.local key holding the whole cache (ddd-02 "Data Persistence"). */
export const REQUIREMENTS_CACHE_KEY = "requirementsCache";

/** The subset of `chrome.storage.local` the cache needs (lets tests use a fake). */
export interface KeyValueStorage {
  get(key: string): Promise<Record<string, unknown>>;
  set(items: Record<string, unknown>): Promise<void>;
}

/**
 * Requirements cache in `chrome.storage.local`: one validated object, pruned on every write.
 * Unreadable or old-version data is dropped (it is only a cache).
 */
export class ChromeStorageRequirementsCache implements RequirementsCacheRepository {
  constructor(private readonly storage: KeyValueStorage = browser.storage.local) {}

  async get(adKey: AdKey, now: Date): Promise<RequirementsCacheEntry | null> {
    const entry = (await this.read()).entries[adKey];
    return entry && isFresh(entry, now) ? entry : null;
  }

  async put(adKey: AdKey, entry: RequirementsCacheEntry, now: Date): Promise<void> {
    const cache = await this.read();
    const entries = pruneEntries({ ...cache.entries, [adKey]: entry }, now);
    const next: RequirementsCache = { schemaVersion: REQUIREMENTS_CACHE_SCHEMA_VERSION, entries };
    await this.storage.set({ [REQUIREMENTS_CACHE_KEY]: next });
  }

  private async read(): Promise<RequirementsCache> {
    const stored = (await this.storage.get(REQUIREMENTS_CACHE_KEY))[REQUIREMENTS_CACHE_KEY];
    const parsed = RequirementsCacheSchema.safeParse(stored);
    return parsed.success
      ? parsed.data
      : { schemaVersion: REQUIREMENTS_CACHE_SCHEMA_VERSION, entries: {} };
  }
}
