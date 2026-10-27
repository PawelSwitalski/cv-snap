/**
 * The Chrome APIs this feature uses, behind a small interface so tests can pass in-memory fakes
 * (WXT's fake browser has limited `permissions` and `scripting` support).
 */

export interface PermissionsChange {
  origins?: string[];
}

export interface ChromeEvent<T extends (...args: never[]) => void> {
  addListener(callback: T): void;
  removeListener(callback: T): void;
}

/** Injecting built script files (WXT types `files` as the extension's known public paths). */
export type ScriptFilesInjection = Extract<
  Parameters<typeof browser.scripting.executeScript>[0],
  { files: unknown }
>;

/** Chrome's own registration type, so the real API and test fakes agree exactly. */
export type RegisteredScript = Parameters<
  typeof browser.scripting.registerContentScripts
>[0][number];

export interface ChromeApis {
  permissions: {
    request(permissions: PermissionsChange): Promise<boolean>;
    remove(permissions: PermissionsChange): Promise<boolean>;
    getAll(): Promise<PermissionsChange>;
    onAdded: ChromeEvent<(permissions: PermissionsChange) => void>;
    onRemoved: ChromeEvent<(permissions: PermissionsChange) => void>;
  };
  scripting: {
    getRegisteredContentScripts(filter: { ids: string[] }): Promise<RegisteredScript[]>;
    registerContentScripts(scripts: RegisteredScript[]): Promise<void>;
    updateContentScripts(scripts: RegisteredScript[]): Promise<void>;
    unregisterContentScripts(filter: { ids: string[] }): Promise<void>;
    executeScript(injection: ScriptFilesInjection): Promise<unknown>;
  };
  tabs: {
    query(query: { url: string[] }): Promise<{ id?: number; url?: string }[]>;
  };
  storage: {
    get(key: string): Promise<Record<string, unknown>>;
    set(items: Record<string, unknown>): Promise<void>;
  };
}

/** The real extension APIs (WXT's `browser`). */
export function browserApis(): ChromeApis {
  return {
    permissions: browser.permissions,
    scripting: {
      getRegisteredContentScripts: (filter) =>
        browser.scripting.getRegisteredContentScripts(filter),
      registerContentScripts: (scripts) => browser.scripting.registerContentScripts(scripts),
      updateContentScripts: (scripts) => browser.scripting.updateContentScripts(scripts),
      unregisterContentScripts: (filter) => browser.scripting.unregisterContentScripts(filter),
      executeScript: (injection) => browser.scripting.executeScript(injection),
    },
    tabs: { query: (query) => browser.tabs.query(query) },
    storage: {
      get: (key) => browser.storage.local.get(key),
      set: (items) => browser.storage.local.set(items),
    },
  };
}
