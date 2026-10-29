import type {
  AddSiteResult,
  AllowedSite,
  AllowedSitesStore,
} from "@/features/allowed-sites/allowed-sites";
import { findPreset } from "@/features/allowed-sites/presets";

/**
 * In-memory allowed sites with the store's interface (bolt 007's real store is tested against
 * fake Chrome APIs). `grant` decides whether "Chrome" allows a request; calls are recorded.
 */
export function fakeAllowedSites(options: { sites?: AllowedSite[]; grant?: boolean } = {}) {
  const sites: AllowedSite[] = [...(options.sites ?? [])];
  const listeners = new Set<(list: AllowedSite[]) => void>();
  const calls: string[] = [];
  const notify = () => {
    for (const listener of listeners) listener([...sites]);
  };
  const add = (site: AllowedSite): AddSiteResult => {
    if (options.grant === false) return { ok: false, reason: "DENIED" };
    sites.push(site);
    notify();
    return { ok: true, site };
  };
  const store: Pick<
    AllowedSitesStore,
    "listSites" | "addPreset" | "addCurrentTab" | "removeSite" | "subscribe"
  > & { calls: string[]; sites: AllowedSite[] } = {
    calls,
    sites,
    listSites: () => Promise.resolve([...sites]),
    addPreset: (id) => {
      calls.push(`preset:${id}`);
      const preset = findPreset(id);
      if (!preset) return Promise.resolve({ ok: false, reason: "UNKNOWN_PRESET" });
      return Promise.resolve(
        add({
          pattern: preset.patterns[0],
          label: preset.label,
          presetId: preset.id,
          addedAt: null,
        }),
      );
    },
    addCurrentTab: (url) => {
      calls.push(`tab:${url}`);
      const host = new URL(url).host;
      return Promise.resolve(
        add({ pattern: `https://${host}/*`, label: host, presetId: null, addedAt: null }),
      );
    },
    removeSite: (pattern) => {
      calls.push(`remove:${pattern}`);
      const index = sites.findIndex((site) => site.pattern === pattern);
      if (index >= 0) sites.splice(index, 1);
      notify();
      return Promise.resolve(index >= 0);
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
  return store;
}
