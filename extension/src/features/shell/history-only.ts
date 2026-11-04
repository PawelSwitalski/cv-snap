import { STORAGE_KEYS, type LocalStore } from "@/lib/storage/local-store";

/**
 * History-only mode (intent 005, story 001-history-only-onboarding): the user chose to use cv-snap
 * without the helper. Stored as `true`; anything else reads as off.
 */
export async function readHistoryOnly(store: LocalStore): Promise<boolean> {
  return (await store.get(STORAGE_KEYS.historyOnly)) === true;
}

export function setHistoryOnly(store: LocalStore, isOn: boolean): Promise<void> {
  return isOn ? store.set(STORAGE_KEYS.historyOnly, true) : store.remove(STORAGE_KEYS.historyOnly);
}
