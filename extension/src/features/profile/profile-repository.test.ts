import { describe, expect, it } from "vitest";
import { createMemoryStore, STORAGE_KEYS } from "@/lib/storage/local-store";
import { smallProfile } from "../../../test/cv-fixtures";
import { draftContent } from "../../../test/panel-fixtures";
import { ChromeStorageProfileRepository, ProfileInvalidError } from "./profile-repository";

const NOW = new Date("2026-10-28T12:00:00Z");

function setup(initial: Record<string, unknown> = {}) {
  const store = createMemoryStore(initial);
  return { store, repository: new ChromeStorageProfileRepository(store, () => NOW) };
}

describe("ChromeStorageProfileRepository", () => {
  it("imports a backed-up profile as active, keeping its confirmation, and drops the draft", async () => {
    const { store, repository } = setup({
      [STORAGE_KEYS.draftProfile]: { content: draftContent(), basedOn: null },
    });
    const imported = smallProfile();

    const active = await repository.importActive(imported, { photoRef: null });

    expect(active).toMatchObject({
      id: imported.id,
      confirmedAt: imported.confirmedAt,
      updatedAt: NOW.toISOString(),
      photoRef: null,
    });
    expect(await repository.getActive()).toEqual(active);
    expect(store.data.has(STORAGE_KEYS.draftProfile)).toBe(false);
  });

  it("has no profile and no draft on first run", async () => {
    const { repository } = setup();

    expect(await repository.getActive()).toBeNull();
    expect(await repository.getDraftInfo()).toBeNull();
  });

  it("confirms a new draft into a versioned active profile and clears the draft", async () => {
    const { store, repository } = setup();
    await repository.saveDraft(draftContent(), null);

    const active = await repository.confirmDraft(draftContent(), { photoRef: null });

    expect(active).toMatchObject({
      schemaVersion: 1,
      confirmedAt: NOW.toISOString(),
      updatedAt: NOW.toISOString(),
      photoRef: null,
    });
    expect(store.data.has(STORAGE_KEYS.draftProfile)).toBe(false);
    expect(await repository.getActive()).toEqual(active);
  });

  it("keeps the profile ID when the draft edits the active profile", async () => {
    const { repository } = setup();
    const first = await repository.confirmDraft(draftContent(), { photoRef: null });
    const copy = await repository.draftFromActive(first);

    const second = await repository.confirmDraft(
      { ...copy, headline: "Senior Frontend Developer" },
      { photoRef: "photo" },
    );

    expect(second.id).toBe(first.id);
    expect(second.photoRef).toBe("photo");
  });

  it("gives a new CV's draft a new profile ID", async () => {
    const { repository } = setup();
    const first = await repository.confirmDraft(draftContent(), { photoRef: null });
    await repository.saveDraft(draftContent(), null);

    const second = await repository.confirmDraft(draftContent(), { photoRef: null });

    expect(second.id).not.toBe(first.id);
  });

  it("accepts a draft with empty required text while editing, but rejects it on confirm", async () => {
    const { repository } = setup();
    const draft = draftContent();
    draft.contact.fullName = "";
    await repository.saveDraft(draft, null);

    expect((await repository.getDraftInfo())?.content.contact.fullName).toBe("");
    await expect(repository.confirmDraft(draft, { photoRef: null })).rejects.toMatchObject({
      name: "ProfileInvalidError",
      paths: ["contact.fullName"],
    });
  });

  it("rejects duplicate IDs on confirm", async () => {
    const { repository } = setup();
    const draft = draftContent();
    const skill = draft.skills[0];
    if (skill) skill.id = "exp_acme";

    await expect(repository.confirmDraft(draft, { photoRef: null })).rejects.toBeInstanceOf(
      ProfileInvalidError,
    );
  });

  it("ignores a corrupted stored profile and draft instead of crashing", async () => {
    const { repository } = setup({
      [STORAGE_KEYS.activeProfile]: { nonsense: true },
      [STORAGE_KEYS.draftProfile]: { content: { experience: "x" }, basedOn: null },
    });

    expect(await repository.getActive()).toBeNull();
    expect(await repository.getDraftInfo()).toBeNull();
  });
});
