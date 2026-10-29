import { STORAGE_KEYS, type LocalStore } from "@/lib/storage/local-store";

/**
 * Version of the privacy notice text (FR-2). Raise it whenever the notice's meaning changes: every
 * user then sees and acknowledges the new text once.
 */
export const PRIVACY_NOTICE_VERSION = 1;

export async function readAcknowledgedNoticeVersion(store: LocalStore): Promise<number> {
  const value = await store.get(STORAGE_KEYS.privacyNoticeVersion);
  return typeof value === "number" && Number.isInteger(value) ? value : 0;
}

export function acknowledgeNotice(store: LocalStore): Promise<void> {
  return store.set(STORAGE_KEYS.privacyNoticeVersion, PRIVACY_NOTICE_VERSION);
}

/** True when the stored acknowledgement covers the current notice text. */
export function isNoticeAcknowledged(acknowledgedVersion: number): boolean {
  return acknowledgedVersion >= PRIVACY_NOTICE_VERSION;
}
