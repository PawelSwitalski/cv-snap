import type { ModelId } from "@cv-snap/shared";
import { createStore, type StoreApi } from "zustand/vanilla";
import type { GdprClauseSettings } from "@/features/cv-pdf/gdpr-clause";
import { logger } from "@/lib/logger";
import { STORAGE_KEYS, type LocalStore } from "@/lib/storage/local-store";
import { DEFAULT_SETTINGS, isGdprClauseValid, parseSettings, type Settings } from "./settings";

export interface SettingsState extends Settings {
  status: "loading" | "ready";
  load: () => Promise<void>;
  setModel: (model: ModelId) => void;
  setGdprClause: (clause: GdprClauseSettings) => void;
}

export type SettingsStore = StoreApi<SettingsState>;

/**
 * Settings of the side panel (story 008), on `chrome.storage.local`. Defaults apply until loaded and
 * for anything unreadable; every change is written at once (a write failure keeps the change for
 * this panel and is logged).
 */
export function createSettingsStore(store: LocalStore): SettingsStore {
  const write = (key: string, value: unknown) => {
    store.set(key, value).catch((error: unknown) => {
      logger.warn("setting not saved", key, error instanceof Error ? error.name : "unknown");
    });
  };

  return createStore<SettingsState>()((set) => ({
    ...DEFAULT_SETTINGS,
    status: "loading",

    async load() {
      const read = (key: string) => store.get(key).catch(() => undefined);
      const [model, gdprClause] = await Promise.all([
        read(STORAGE_KEYS.model),
        read(STORAGE_KEYS.gdprClause),
      ]);
      set({ ...parseSettings({ model, gdprClause }), status: "ready" });
    },

    setModel(model) {
      set({ model });
      write(STORAGE_KEYS.model, model);
    },

    setGdprClause(clause) {
      if (!isGdprClauseValid(clause)) return;
      set({ gdprClause: clause });
      write(STORAGE_KEYS.gdprClause, clause);
    },
  }));
}
