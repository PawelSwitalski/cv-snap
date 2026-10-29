import { createStore, del, get, set, type UseStore } from "idb-keyval";

/**
 * Binary files kept on this PC (IndexedDB `cv-snap`, store `files`): the original CV PDF and the
 * optional photo. Never sent anywhere except the PDF to the local native host.
 */
export interface FileStore {
  get(key: FileKey): Promise<Blob | undefined>;
  set(key: FileKey, file: Blob): Promise<void>;
  delete(key: FileKey): Promise<void>;
}

export const FILE_KEYS = { cvOriginal: "cv-original", photo: "photo" } as const;
export type FileKey = (typeof FILE_KEYS)[keyof typeof FILE_KEYS];

let store: UseStore | undefined;
/** Opened on first use, so opening the side panel doesn't touch IndexedDB. */
const filesStore = () => (store ??= createStore("cv-snap", "files"));

export const indexedDbFileStore: FileStore = {
  get: (key) => get<Blob>(key, filesStore()),
  set: (key, file) => set(key, file, filesStore()),
  delete: (key) => del(key, filesStore()),
};

/** In-memory file store for tests. */
export function createMemoryFileStore(): FileStore & { files: Map<FileKey, Blob> } {
  const files = new Map<FileKey, Blob>();
  return {
    files,
    get: (key) => Promise.resolve(files.get(key)),
    set: (key, file) => {
      files.set(key, file);
      return Promise.resolve();
    },
    delete: (key) => {
      files.delete(key);
      return Promise.resolve();
    },
  };
}
