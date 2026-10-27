import { browserApis, type ChromeApis } from "./chrome-apis";
import { isSitePattern, labelForPattern, sitePatternForUrl } from "./origin";
import { findPreset, presetForPattern, type PresetId } from "./presets";

/**
 * Allowed sites (story 001-allowed-sites-management). Chrome's granted host permissions are the
 * source of truth; `chrome.storage.local` only keeps display metadata, so the list can never claim
 * access Chrome doesn't actually give (and follows revocations made in chrome://extensions).
 */

export interface AllowedSite {
  pattern: string;
  label: string;
  presetId: PresetId | null;
  /** ISO timestamp when cv-snap added it; null if granted outside cv-snap's flows. */
  addedAt: string | null;
}

export type AddSiteResult =
  | { ok: true; site: AllowedSite }
  | { ok: false; reason: "DENIED" | "UNKNOWN_PRESET" | "UNSUPPORTED_SCHEME" | "INVALID_URL" };

interface SiteMetadata {
  label: string;
  presetId: PresetId | null;
  addedAt: string;
}

export const METADATA_STORAGE_KEY = "allowedSites.metadata";

export function createAllowedSites(
  apis: ChromeApis = browserApis(),
  now: () => Date = () => new Date(),
) {
  const readMetadata = async (): Promise<Record<string, SiteMetadata>> => {
    const stored = (await apis.storage.get(METADATA_STORAGE_KEY))[METADATA_STORAGE_KEY];
    return typeof stored === "object" && stored !== null
      ? (stored as Record<string, SiteMetadata>)
      : {};
  };
  const writeMetadata = (metadata: Record<string, SiteMetadata>) =>
    apis.storage.set({ [METADATA_STORAGE_KEY]: metadata });

  const grantedPatterns = async (): Promise<string[]> => {
    const { origins = [] } = await apis.permissions.getAll();
    return [...new Set(origins.filter(isSitePattern))].sort();
  };

  const toSite = (pattern: string, metadata: SiteMetadata | undefined): AllowedSite => {
    const preset = presetForPattern(pattern);
    return {
      pattern,
      label: metadata?.label ?? preset?.label ?? labelForPattern(pattern),
      presetId: metadata?.presetId ?? preset?.id ?? null,
      addedAt: metadata?.addedAt ?? null,
    };
  };

  const remember = async (
    patterns: readonly string[],
    label: string,
    presetId: PresetId | null,
  ) => {
    const metadata = await readMetadata();
    const addedAt = now().toISOString();
    for (const pattern of patterns) metadata[pattern] = { label, presetId, addedAt };
    await writeMetadata(metadata);
  };

  const listSites = async (): Promise<AllowedSite[]> => {
    const [patterns, metadata] = await Promise.all([grantedPatterns(), readMetadata()]);
    return patterns.map((pattern) => toSite(pattern, metadata[pattern]));
  };

  return {
    listSites,

    /**
     * Must be called directly from the user's click: `permissions.request` is the first call, made
     * synchronously, so Chrome still sees the user gesture.
     */
    async addPreset(id: string): Promise<AddSiteResult> {
      const preset = findPreset(id);
      if (!preset) return { ok: false, reason: "UNKNOWN_PRESET" };
      const isGranted = await apis.permissions.request({ origins: [...preset.patterns] });
      if (!isGranted) return { ok: false, reason: "DENIED" };
      await remember(preset.patterns, preset.label, preset.id);
      const [pattern] = preset.patterns;
      return { ok: true, site: toSite(pattern, (await readMetadata())[pattern]) };
    },

    /** "Add this site" for the current tab; same user-gesture rule as `addPreset`. */
    async addCurrentTab(url: string): Promise<AddSiteResult> {
      const result = sitePatternForUrl(url);
      if (!result.ok) return result;
      const isGranted = await apis.permissions.request({ origins: [result.pattern] });
      if (!isGranted) return { ok: false, reason: "DENIED" };
      const preset = presetForPattern(result.pattern);
      await remember([result.pattern], preset?.label ?? result.host, preset?.id ?? null);
      return { ok: true, site: toSite(result.pattern, (await readMetadata())[result.pattern]) };
    },

    /** Removes the site and revokes its Chrome permission. */
    async removeSite(pattern: string): Promise<boolean> {
      const isRemoved = await apis.permissions.remove({ origins: [pattern] });
      await forgetPatterns(apis, [pattern]);
      return isRemoved;
    },

    /** Calls `listener` with the fresh list whenever permissions change (including outside cv-snap). */
    subscribe(listener: (sites: AllowedSite[]) => void): () => void {
      const notify = () => {
        void listSites().then(listener);
      };
      apis.permissions.onAdded.addListener(notify);
      apis.permissions.onRemoved.addListener(notify);
      return () => {
        apis.permissions.onAdded.removeListener(notify);
        apis.permissions.onRemoved.removeListener(notify);
      };
    },
  };
}

export type AllowedSitesStore = ReturnType<typeof createAllowedSites>;

/** Drops display metadata for revoked patterns (e.g. revoked in chrome://extensions). */
export async function forgetPatterns(apis: ChromeApis, patterns: readonly string[]): Promise<void> {
  if (patterns.length === 0) return;
  const stored = (await apis.storage.get(METADATA_STORAGE_KEY))[METADATA_STORAGE_KEY];
  if (typeof stored !== "object" || stored === null) return;
  const metadata = Object.fromEntries(
    Object.entries(stored as Record<string, SiteMetadata>).filter(
      ([pattern]) => !patterns.includes(pattern),
    ),
  );
  await apis.storage.set({ [METADATA_STORAGE_KEY]: metadata });
}
