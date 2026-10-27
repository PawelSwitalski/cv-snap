import type { AdKey, CvProfile, CvProfileContent, RequirementsCacheEntry } from "@cv-snap/shared";

/** Requirements cache port (ddd-01). Failures are treated as a miss by the services. */
export interface RequirementsCacheRepository {
  /** A **fresh** entry for `adKey`, or null (missing or stale). */
  get(adKey: AdKey, now: Date): Promise<RequirementsCacheEntry | null>;
  /** Stores (replaces) the entry and prunes stale and excess entries. */
  put(adKey: AdKey, entry: RequirementsCacheEntry, now: Date): Promise<void>;
}

/**
 * Profile storage port (ddd-01). Implemented with the profile UI in bolt 010; the tailoring
 * services only receive profiles as arguments.
 */
export interface ProfileRepository {
  getActive(): Promise<CvProfile | null>;
  getDraft(): Promise<CvProfileContent | null>;
  saveDraft(draft: CvProfileContent): Promise<void>;
  confirm(draft: CvProfileContent): Promise<CvProfile>;
}

export type Clock = () => Date;
