import type {
  ChromeApis,
  PermissionsChange,
  RegisteredScript,
  ScriptFilesInjection,
} from "./chrome-apis";

/**
 * In-memory stand-in for the Chrome APIs used by allowed sites and content-script registration.
 * Test-only (imported from `*.test.ts` files): behaves like Chrome for the calls cv-snap makes,
 * including firing `permissions.onAdded` / `onRemoved`.
 */
export function createFakeChrome(
  options: { granted?: string[]; tabs?: { id?: number; url?: string }[] } = {},
) {
  const granted = new Set(options.granted ?? []);
  const registered = new Map<string, RegisteredScript>();
  const storage: Record<string, unknown> = {};
  const injections: ScriptFilesInjection[] = [];
  const requests: PermissionsChange[] = [];
  const onAdded = listeners<(permissions: PermissionsChange) => void>();
  const onRemoved = listeners<(permissions: PermissionsChange) => void>();
  const state = {
    /** What the user answers in Chrome's permission prompt. */
    willGrant: true,
    tabs: options.tabs ?? [],
    /** Tab ids whose injection fails (e.g. the tab navigated to an error page). */
    failingTabs: new Set<number>(),
  };

  const apis: ChromeApis = {
    permissions: {
      request: (permissions) => {
        requests.push(permissions);
        if (!state.willGrant) return Promise.resolve(false);
        const added = (permissions.origins ?? []).filter((origin) => !granted.has(origin));
        for (const origin of added) granted.add(origin);
        if (added.length > 0) onAdded.fire({ origins: added });
        return Promise.resolve(true);
      },
      remove: (permissions) => {
        const removed = (permissions.origins ?? []).filter((origin) => granted.delete(origin));
        if (removed.length > 0) onRemoved.fire({ origins: removed });
        return Promise.resolve(removed.length > 0);
      },
      getAll: () => Promise.resolve({ origins: [...granted] }),
      onAdded: onAdded.event,
      onRemoved: onRemoved.event,
    },
    scripting: {
      getRegisteredContentScripts: (filter) =>
        Promise.resolve(
          filter.ids.flatMap((id) => {
            const script = registered.get(id);
            return script ? [structuredClone(script)] : [];
          }),
        ),
      registerContentScripts: (scripts) => {
        for (const script of scripts) {
          if (registered.has(script.id)) {
            return Promise.reject(new Error(`Duplicate script ID '${script.id}'`));
          }
          registered.set(script.id, structuredClone(script));
        }
        return Promise.resolve();
      },
      updateContentScripts: (scripts) => {
        for (const script of scripts) {
          const existing = registered.get(script.id);
          if (!existing) return Promise.reject(new Error(`Nonexistent script ID '${script.id}'`));
          registered.set(script.id, { ...existing, ...structuredClone(script) });
        }
        return Promise.resolve();
      },
      unregisterContentScripts: (filter) => {
        for (const id of filter.ids) registered.delete(id);
        return Promise.resolve();
      },
      executeScript: (injection) => {
        if ("tabId" in injection.target && state.failingTabs.has(injection.target.tabId)) {
          return Promise.reject(new Error("Cannot access contents of the page"));
        }
        injections.push(injection);
        return Promise.resolve([]);
      },
    },
    tabs: {
      // Chrome filters by match pattern itself; the fake returns every tab with a URL so the code's
      // own URL check is exercised too.
      query: () => Promise.resolve(state.tabs.filter((tab) => tab.url !== undefined)),
    },
    storage: {
      get: (key) => Promise.resolve(key in storage ? { [key]: structuredClone(storage[key]) } : {}),
      set: (items) => {
        Object.assign(storage, structuredClone(items));
        return Promise.resolve();
      },
    },
  };

  return {
    apis,
    state,
    granted,
    registered,
    storage,
    injections,
    requests,
    /** Simulates a revocation made outside cv-snap, e.g. in chrome://extensions. */
    revokeExternally: (origins: string[]) => {
      for (const origin of origins) granted.delete(origin);
      onRemoved.fire({ origins });
    },
    listenerCount: () => onAdded.count() + onRemoved.count(),
  };
}

function listeners<T extends (...args: never[]) => void>() {
  const callbacks = new Set<T>();
  return {
    event: {
      addListener: (callback: T) => {
        callbacks.add(callback);
      },
      removeListener: (callback: T) => {
        callbacks.delete(callback);
      },
    },
    fire: (...args: Parameters<T>) => {
      for (const callback of callbacks) callback(...args);
    },
    count: () => callbacks.size,
  };
}
