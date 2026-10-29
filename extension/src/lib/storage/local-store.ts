/**
 * Small key-value port over `chrome.storage.local` (system architecture → State Management).
 * Values are untrusted on read: callers validate them with a schema before use.
 */
export interface LocalStore {
  get(key: string): Promise<unknown>;
  set(key: string, value: unknown): Promise<void>;
  remove(key: string): Promise<void>;
}

export const chromeLocalStore: LocalStore = {
  async get(key) {
    const items = await browser.storage.local.get(key);
    return items[key];
  },
  async set(key, value) {
    await browser.storage.local.set({ [key]: value });
  },
  async remove(key) {
    await browser.storage.local.remove(key);
  },
};

/**
 * The same port over `chrome.storage.session`: kept in memory only (never written to disk), cleared
 * when Chrome closes, and not readable by content scripts (default access level).
 */
export const chromeSessionStore: LocalStore = {
  async get(key) {
    const items = await browser.storage.session.get(key);
    return items[key];
  },
  async set(key, value) {
    await browser.storage.session.set({ [key]: value });
  },
  async remove(key) {
    await browser.storage.session.remove(key);
  },
};

/** Keys in `chrome.storage.session` (besides the job-ad badge state of bolt 008). */
export const SESSION_KEYS = {
  /** The last generation result with the user's preview edits (bolt 011). */
  lastGeneration: "generate.lastResult",
} as const;

/** In-memory store for tests and previews. */
export function createMemoryStore(initial: Record<string, unknown> = {}): LocalStore & {
  data: Map<string, unknown>;
} {
  const data = new Map(Object.entries(initial));
  return {
    data,
    get: (key) => Promise.resolve(structuredClone(data.get(key))),
    set: (key, value) => {
      data.set(key, structuredClone(value));
      return Promise.resolve();
    },
    remove: (key) => {
      data.delete(key);
      return Promise.resolve();
    },
  };
}

/** Storage keys of the side panel (one place, so the layout is documented and stable). */
export const STORAGE_KEYS = {
  uiLanguage: "settings.uiLanguage",
  privacyNoticeVersion: "onboarding.privacyNoticeVersion",
  activeProfile: "profile.active",
  draftProfile: "profile.draft",
} as const;
