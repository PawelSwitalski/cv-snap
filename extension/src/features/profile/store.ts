import type { CvProfile, CvProfileContent } from "@cv-snap/shared";
import { createStore, type StoreApi } from "zustand/vanilla";
import { logger } from "@/lib/logger";
import { FILE_KEYS, type FileStore } from "@/lib/storage/file-store";
import { validatePhoto, type PhotoProblem } from "./photo";
import { ProfileInvalidError, type ChromeStorageProfileRepository } from "./profile-repository";

/** Typing is saved this long after the last keystroke; structural edits too (one code path). */
export const SAVE_DEBOUNCE_MS = 300;

export type SaveState = "saved" | "saving" | "error";

export interface ProfileState {
  status: "loading" | "ready";
  /** The confirmed profile: the only source of facts for generation. */
  active: CvProfile | null;
  /** The profile under review (from a new CV, or a copy of the active one being edited). */
  draft: CvProfileContent | null;
  /** True when the draft edits the active profile (same ID; no replace prompt). */
  isEditingActive: boolean;
  saveState: SaveState;
  /** Snapshot taken before the last deletion, for "Undo". */
  undoSnapshot: CvProfileContent | null;
  hasPhoto: boolean;

  // Actions are closures over the store (no `this`), so components may pass them around freely.
  load: () => Promise<void>;
  /** A new draft created from an uploaded CV (story 003). */
  setNewDraft: (draft: CvProfileContent) => void;
  /** Applies an edit to the draft and schedules the save (story 004: saved immediately). */
  edit: (
    change: (draft: CvProfileContent) => CvProfileContent,
    options?: { isDeletion?: boolean },
  ) => void;
  undoDeletion: () => void;
  /** Writes any pending edit now (panel closing, before confirm). */
  flush: () => Promise<void>;
  confirm: () => Promise<{ ok: true } | { ok: false; paths: string[] }>;
  editActive: () => Promise<void>;
  discardDraft: () => Promise<void>;
  setPhoto: (file: Blob) => Promise<PhotoProblem | null>;
  removePhoto: () => Promise<void>;
  photo: () => Promise<Blob | undefined>;
  /** Makes a profile from a backup the active one, with its photo or none (story 009). */
  importProfile: (profile: CvProfile, photo: Blob | null) => Promise<void>;
}

export type ProfileStore = StoreApi<ProfileState>;

export interface ProfileStoreDeps {
  repository: ChromeStorageProfileRepository;
  files: FileStore;
  /** Called after the active profile changed (bolt 011 invalidates its cached plan). */
  onActiveChanged?: (profile: CvProfile) => void;
}

/** One store per side panel (Zustand store per feature, system architecture). */
export function createProfileStore(deps: ProfileStoreDeps): ProfileStore {
  let saveTimer: ReturnType<typeof setTimeout> | undefined;
  let pendingSave: Promise<void> = Promise.resolve();

  return createStore<ProfileState>()((set, get) => {
    const writeDraft = async () => {
      const { draft } = get();
      if (!draft) return;
      set({ saveState: "saving" });
      try {
        await deps.repository.saveDraft(draft);
        set({ saveState: "saved" });
      } catch (error) {
        logger.error("draft not saved", error instanceof Error ? error.name : "unknown");
        set({ saveState: "error" });
      }
    };

    const scheduleSave = () => {
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => {
        saveTimer = undefined;
        pendingSave = writeDraft();
      }, SAVE_DEBOUNCE_MS);
    };

    return {
      status: "loading",
      active: null,
      draft: null,
      isEditingActive: false,
      saveState: "saved",
      undoSnapshot: null,
      hasPhoto: false,

      async load() {
        const [active, draftInfo, photo] = await Promise.all([
          deps.repository.getActive(),
          deps.repository.getDraftInfo(),
          deps.files.get(FILE_KEYS.photo).catch(() => undefined),
        ]);
        set({
          status: "ready",
          active,
          draft: draftInfo?.content ?? null,
          isEditingActive: draftInfo?.basedOn !== null && draftInfo?.basedOn === active?.id,
          hasPhoto: photo !== undefined,
        });
      },

      setNewDraft(draft) {
        set({ draft, isEditingActive: false, undoSnapshot: null, saveState: "saved" });
      },

      edit(change, options = {}) {
        const { draft } = get();
        if (!draft) return;
        set({
          draft: change(draft),
          // Undo covers only the latest edit: restoring an older snapshot would silently throw
          // away everything typed since the deletion.
          undoSnapshot: options.isDeletion ? draft : null,
          saveState: "saving",
        });
        scheduleSave();
      },

      undoDeletion() {
        const { undoSnapshot } = get();
        if (!undoSnapshot) return;
        set({ draft: undoSnapshot, undoSnapshot: null, saveState: "saving" });
        scheduleSave();
      },

      async flush() {
        if (saveTimer !== undefined) {
          clearTimeout(saveTimer);
          saveTimer = undefined;
          pendingSave = writeDraft();
        }
        await pendingSave;
      },

      async confirm() {
        await get().flush();
        const { draft, hasPhoto } = get();
        if (!draft) return { ok: false, paths: [] };
        try {
          const active = await deps.repository.confirmDraft(draft, {
            photoRef: hasPhoto ? FILE_KEYS.photo : null,
          });
          set({ active, draft: null, isEditingActive: false, undoSnapshot: null });
          deps.onActiveChanged?.(active);
          return { ok: true };
        } catch (error) {
          if (error instanceof ProfileInvalidError) return { ok: false, paths: error.paths };
          throw error;
        }
      },

      async editActive() {
        const { active } = get();
        if (!active) return;
        const draft = await deps.repository.draftFromActive(active);
        set({ draft, isEditingActive: true, undoSnapshot: null, saveState: "saved" });
      },

      async discardDraft() {
        clearTimeout(saveTimer);
        saveTimer = undefined;
        await pendingSave;
        await deps.repository.discardDraft();
        set({ draft: null, isEditingActive: false, undoSnapshot: null, saveState: "saved" });
      },

      async setPhoto(file) {
        const problem = await validatePhoto(file);
        if (problem) return problem;
        await deps.files.set(FILE_KEYS.photo, file);
        set({ hasPhoto: true });
        return null;
      },

      async removePhoto() {
        await deps.files.delete(FILE_KEYS.photo);
        set({ hasPhoto: false });
      },

      photo() {
        return deps.files.get(FILE_KEYS.photo);
      },

      async importProfile(profile, photo) {
        clearTimeout(saveTimer);
        saveTimer = undefined;
        await pendingSave;
        // Profile first: if storing it fails, the current photo is left untouched.
        const active = await deps.repository.importActive(profile, {
          photoRef: photo ? FILE_KEYS.photo : null,
        });
        if (photo) await deps.files.set(FILE_KEYS.photo, photo);
        else await deps.files.delete(FILE_KEYS.photo);
        set({
          active,
          draft: null,
          isEditingActive: false,
          undoSnapshot: null,
          saveState: "saved",
          hasPhoto: photo !== null,
        });
        deps.onActiveChanged?.(active);
      },
    };
  });
}
