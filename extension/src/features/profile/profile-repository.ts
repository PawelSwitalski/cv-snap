import {
  CV_PROFILE_SCHEMA_VERSION,
  CvProfileContentSchema,
  CvProfileSchema,
  newId,
  ParsedCvProfileContentSchema,
  type CvProfile,
  type CvProfileContent,
} from "@cv-snap/shared";
import { z } from "zod";
import type { ProfileRepository } from "@/features/tailoring/ports";
import { logger } from "@/lib/logger";
import { STORAGE_KEYS, type LocalStore } from "@/lib/storage/local-store";

/** Stored draft: the content being reviewed, and the active profile it was copied from, if any. */
interface StoredDraft {
  content: CvProfileContent;
  basedOn: string | null;
}

export interface DraftInfo {
  content: CvProfileContent;
  /** ID of the active profile this draft edits; null for a draft from a new CV. */
  basedOn: string | null;
}

/** A confirm that failed validation; `paths` name the fields to fix (no values). */
export class ProfileInvalidError extends Error {
  override readonly name = "ProfileInvalidError";
  constructor(readonly paths: string[]) {
    super("Profile has invalid or missing fields");
  }
}

/**
 * Profile storage on `chrome.storage.local` (system architecture): `profile.active` is the confirmed
 * profile, the only source of facts; `profile.draft` is the profile under review. Every edit is
 * written at once (story 004), so drafts may briefly hold empty required fields while the user
 * types; they are accepted on read but rejected by `confirm`.
 */
export class ChromeStorageProfileRepository implements ProfileRepository {
  constructor(
    private readonly store: LocalStore,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async getActive(): Promise<CvProfile | null> {
    const raw = await this.store.get(STORAGE_KEYS.activeProfile);
    if (raw === undefined) return null;
    const parsed = CvProfileSchema.safeParse(raw);
    if (parsed.success) return parsed.data;
    logger.warn("stored active profile is invalid and was ignored", parsed.error.issues.length);
    return null;
  }

  async getDraft(): Promise<CvProfileContent | null> {
    return (await this.getDraftInfo())?.content ?? null;
  }

  async getDraftInfo(): Promise<DraftInfo | null> {
    const raw = await this.store.get(STORAGE_KEYS.draftProfile);
    if (raw === undefined) return null;
    const draft = parseStoredDraft(raw);
    if (!draft) logger.warn("stored draft profile is invalid and was ignored");
    return draft;
  }

  /** Saves the draft; keeps which active profile it edits. */
  async saveDraft(content: CvProfileContent, basedOn?: string | null): Promise<void> {
    const previous = basedOn === undefined ? await this.getDraftInfo() : null;
    const stored: StoredDraft = { content, basedOn: basedOn ?? previous?.basedOn ?? null };
    await this.store.set(STORAGE_KEYS.draftProfile, stored);
  }

  /** Starts editing the active profile: copies it into the draft with the same IDs. */
  async draftFromActive(active: CvProfile): Promise<CvProfileContent> {
    const content = CvProfileContentSchema.parse(active);
    await this.saveDraft(content, active.id);
    return content;
  }

  discardDraft(): Promise<void> {
    return this.store.remove(STORAGE_KEYS.draftProfile);
  }

  /** Port method: confirms with no photo change. */
  confirm(draft: CvProfileContent): Promise<CvProfile> {
    return this.confirmDraft(draft, { photoRef: null });
  }

  /**
   * Makes the draft the active profile (FR-5): strict validation, `confirmedAt`/`updatedAt` set,
   * the same profile ID when the draft edits the active profile, and the draft cleared.
   */
  async confirmDraft(
    draft: CvProfileContent,
    options: { photoRef: string | null },
  ): Promise<CvProfile> {
    const parsed = ParsedCvProfileContentSchema.safeParse(draft);
    if (!parsed.success) {
      throw new ProfileInvalidError(parsed.error.issues.map((issue) => issue.path.join(".")));
    }
    const info = await this.getDraftInfo();
    const stamp = this.now().toISOString();
    const profile: CvProfile = CvProfileSchema.parse({
      ...parsed.data,
      schemaVersion: CV_PROFILE_SCHEMA_VERSION,
      id: info?.basedOn ?? newId("prof"),
      photoRef: options.photoRef,
      confirmedAt: stamp,
      updatedAt: stamp,
    });
    await this.store.set(STORAGE_KEYS.activeProfile, profile);
    await this.store.remove(STORAGE_KEYS.draftProfile);
    return profile;
  }
}

const StoredDraftShape = z.object({ content: z.unknown(), basedOn: z.string().nullable() });

/**
 * Accepts a stored draft that is valid, or invalid only because some text fields are empty or too
 * short (transient while editing). Anything else (wrong shape, wrong types) is rejected.
 */
function parseStoredDraft(raw: unknown): DraftInfo | null {
  const shape = StoredDraftShape.safeParse(raw);
  if (!shape.success) return null;
  const content = CvProfileContentSchema.safeParse(shape.data.content);
  if (content.success) return { content: content.data, basedOn: shape.data.basedOn };
  const onlyEmptyText = content.error.issues.every(
    (issue) => issue.code === "too_small" && issue.origin === "string",
  );
  return onlyEmptyText
    ? { content: shape.data.content as CvProfileContent, basedOn: shape.data.basedOn }
    : null;
}
