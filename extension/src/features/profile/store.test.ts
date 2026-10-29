import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { createMemoryFileStore, FILE_KEYS } from "@/lib/storage/file-store";
import { createMemoryStore } from "@/lib/storage/local-store";
import { bytesFile, draftContent, PNG_HEAD } from "../../../test/panel-fixtures";
import { removeItem, updateItem } from "./editing";
import { ChromeStorageProfileRepository } from "./profile-repository";
import { createProfileStore } from "./store";

function setup(memory = createMemoryStore(), files = createMemoryFileStore()) {
  const repository = new ChromeStorageProfileRepository(memory);
  const store = createProfileStore({ repository, files });
  return { memory, files, repository, store };
}

describe("profile store", () => {
  it("saves every edit so it survives reopening the panel", async () => {
    const { memory, store } = setup();
    await store.getState().load();
    store.getState().setNewDraft(draftContent());

    store.getState().edit((draft) => ({ ...draft, headline: "Edited headline" }));
    await store.getState().flush();

    const reopened = setup(memory).store;
    await reopened.getState().load();
    expect(reopened.getState().draft?.headline).toBe("Edited headline");
    expect(store.getState().saveState).toBe("saved");
  });

  it("reports a newly confirmed profile, so a CV generated from the old one is dropped", async () => {
    const memory = createMemoryStore();
    const confirmed: string[] = [];
    const store = createProfileStore({
      repository: new ChromeStorageProfileRepository(memory),
      files: createMemoryFileStore(),
      onActiveChanged: (profile) => confirmed.push(profile.contact.fullName),
    });
    await store.getState().load();
    store.getState().setNewDraft(draftContent());

    const result = await store.getState().confirm();

    expect(result).toEqual({ ok: true });
    expect(confirmed).toEqual([draftContent().contact.fullName]);
  });

  it("restores a deleted item with Undo", async () => {
    const { store } = setup();
    await store.getState().load();
    store.getState().setNewDraft(draftContent());

    store.getState().edit((draft) => removeItem(draft, "experience", "exp_acme"), {
      isDeletion: true,
    });
    store.getState().undoDeletion();

    expect(store.getState().draft?.experience.map((item) => item.id)).toEqual([
      "exp_acme",
      "exp_beta",
    ]);
    expect(store.getState().undoSnapshot).toBeNull();
  });

  it("drops the Undo offer after a later edit, so Undo never wipes newer edits", async () => {
    const { store } = setup();
    await store.getState().load();
    store.getState().setNewDraft(draftContent());

    store.getState().edit((draft) => removeItem(draft, "experience", "exp_beta"), {
      isDeletion: true,
    });
    store
      .getState()
      .edit((draft) => updateItem(draft, "experience", "exp_acme", { company: "Typed later" }));
    store.getState().undoDeletion();

    expect(store.getState().undoSnapshot).toBeNull();
    expect(store.getState().draft?.experience[0]?.company).toBe("Typed later");
  });

  it("confirms the draft into the active profile", async () => {
    const { store } = setup();
    await store.getState().load();
    store.getState().setNewDraft(draftContent());

    const result = await store.getState().confirm();

    expect(result).toEqual({ ok: true });
    expect(store.getState().active?.contact.fullName).toBe("Jan Testowy");
    expect(store.getState().draft).toBeNull();
  });

  it("confirms a job without an employer (company left empty)", async () => {
    const { store } = setup();
    await store.getState().load();
    store.getState().setNewDraft(draftContent());
    store
      .getState()
      .edit((draft) => updateItem(draft, "experience", "exp_acme", { company: null }));

    const result = await store.getState().confirm();

    expect(result).toEqual({ ok: true });
    expect(
      store.getState().active?.experience.find((item) => item.id === "exp_acme")?.company,
    ).toBeNull();
  });

  it("reports the invalid fields on confirm and keeps the draft", async () => {
    const { store } = setup();
    await store.getState().load();
    store.getState().setNewDraft(draftContent());
    store.getState().edit((draft) => ({ ...draft, contact: { ...draft.contact, fullName: "" } }));

    const result = await store.getState().confirm();

    expect(result).toEqual({ ok: false, paths: ["contact.fullName"] });
    expect(store.getState().draft).not.toBeNull();
  });

  it("edits the active profile through a draft copy with the same IDs", async () => {
    const { store } = setup();
    await store.getState().load();
    store.getState().setNewDraft(draftContent());
    await store.getState().confirm();
    const activeId = store.getState().active?.id;

    await store.getState().editActive();
    expect(store.getState().isEditingActive).toBe(true);
    await store.getState().confirm();

    expect(store.getState().active?.id).toBe(activeId);
  });

  it("discards a draft without touching the active profile", async () => {
    const { store } = setup();
    await store.getState().load();
    store.getState().setNewDraft(draftContent());
    await store.getState().confirm();
    await store.getState().editActive();

    await store.getState().discardDraft();

    expect(store.getState().draft).toBeNull();
    expect(store.getState().active).not.toBeNull();
  });

  it("stores a valid photo and rejects an invalid one", async () => {
    const { files, store } = setup();
    await store.getState().load();

    expect(await store.getState().setPhoto(bytesFile(PNG_HEAD, "me.png", "image/png"))).toBeNull();
    expect(files.files.has(FILE_KEYS.photo)).toBe(true);
    expect(store.getState().hasPhoto).toBe(true);
    expect(await store.getState().setPhoto(new Blob(["text"]))).toBe("NOT_IMAGE");

    await store.getState().removePhoto();
    expect(files.files.has(FILE_KEYS.photo)).toBe(false);
  });
});
