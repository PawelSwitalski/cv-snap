import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { I18nProvider } from "@/lib/i18n/i18n";
import { formatMessage } from "@/lib/i18n/messages";
import { createMemoryFileStore } from "@/lib/storage/file-store";
import { createMemoryStore } from "@/lib/storage/local-store";
import { bytesFile, draftContent, PNG_HEAD, pdfFile } from "../../../../test/panel-fixtures";
import { ChromeStorageProfileRepository } from "../profile-repository";
import { createProfileStore } from "../store";
import ProfileEditor from "./ProfileEditor";

const en = (key: Parameters<typeof formatMessage>[1], ...subs: string[]) =>
  formatMessage("en", key, subs);
/** Required labels end with an aria-hidden " *" marker. */
const startsWith = (text: string) => (content: string) => content.startsWith(text);
const wrap = (ui: ReactNode) => (
  <I18nProvider store={createMemoryStore()} browserLanguage="en-US">
    {ui}
  </I18nProvider>
);

async function setup(options: { withActive?: boolean } = {}) {
  const memory = createMemoryStore();
  const files = createMemoryFileStore();
  const store = createProfileStore({
    repository: new ChromeStorageProfileRepository(memory),
    files,
  });
  await store.getState().load();
  if (options.withActive) {
    store.getState().setNewDraft(draftContent());
    await store.getState().confirm();
  }
  store.getState().setNewDraft(draftContent());
  render(wrap(<ProfileEditor store={store} />));
  return { store, files, memory };
}

const experienceIds = (store: Awaited<ReturnType<typeof setup>>["store"]) =>
  store.getState().draft?.experience.map((item) => item.id);

describe("ProfileEditor", () => {
  it("edits a field and saves it", async () => {
    const user = userEvent.setup();
    const { store } = await setup();
    const name = screen.getByLabelText(startsWith(en("field_full_name")));

    await user.clear(name);
    await user.type(name, "Anna Testowa");
    await store.getState().flush();

    expect(store.getState().draft?.contact.fullName).toBe("Anna Testowa");
    expect(store.getState().saveState).toBe("saved");
  });

  it("reorders items with the Move buttons", async () => {
    const user = userEvent.setup();
    const { store } = await setup();

    await user.click(
      screen.getByRole("button", { name: en("editor_move_down", "Acme Sp. z o.o.") }),
    );

    expect(experienceIds(store)).toEqual(["exp_beta", "exp_acme"]);
  });

  it("reorders an item with Alt+↓ while focus is inside it", async () => {
    const { store } = await setup();
    const company = screen.getAllByDisplayValue("Acme Sp. z o.o.")[0];
    if (!company) throw new Error("company field missing");

    fireEvent.keyDown(company, { key: "ArrowDown", altKey: true });

    expect(experienceIds(store)).toEqual(["exp_beta", "exp_acme"]);
  });

  it("moves only the bullet (not its job) with Alt+↓ inside a bullet", async () => {
    const { store } = await setup();
    const first = screen.getByDisplayValue("Migracja aplikacji z JavaScript do TypeScript.");

    fireEvent.keyDown(first, { key: "ArrowDown", altKey: true });

    expect(experienceIds(store)).toEqual(["exp_acme", "exp_beta"]);
    expect(store.getState().draft?.experience[0]?.bullets.map((bullet) => bullet.id)).toEqual([
      "exp_acme_b2",
      "exp_acme_b1",
    ]);
  });

  it("deletes an item and restores it with Undo", async () => {
    const user = userEvent.setup();
    const { store } = await setup();

    await user.click(screen.getByRole("button", { name: en("editor_delete", "Beta Soft") }));
    expect(experienceIds(store)).toEqual(["exp_acme"]);
    await user.click(screen.getByRole("button", { name: en("editor_undo") }));

    expect(experienceIds(store)).toEqual(["exp_acme", "exp_beta"]);
  });

  it("shows the invalid-field count instead of confirming an incomplete profile", async () => {
    const user = userEvent.setup();
    const { store } = await setup();
    await user.clear(screen.getByLabelText(startsWith(en("field_full_name"))));

    await user.click(screen.getByRole("button", { name: en("editor_confirm") }));

    expect(await screen.findByText(en("editor_invalid", "1"))).toBeTruthy();
    expect(store.getState().active).toBeNull();
  });

  it("asks before replacing a different active profile, and keeps it on 'keep'", async () => {
    const user = userEvent.setup();
    const { store } = await setup({ withActive: true });
    const activeId = store.getState().active?.id;

    await user.click(screen.getByRole("button", { name: en("editor_confirm") }));
    const dialog = await screen.findByRole("alertdialog");
    expect(within(dialog).getByText(en("replace_title"))).toBeTruthy();
    await user.click(within(dialog).getByRole("button", { name: en("replace_keep") }));

    expect(store.getState().active?.id).toBe(activeId);
    expect(store.getState().draft).not.toBeNull();
  });

  it("moves focus into the replace dialog and closes it with Escape", async () => {
    const user = userEvent.setup();
    await setup({ withActive: true });

    await user.click(screen.getByRole("button", { name: en("editor_confirm") }));
    const dialog = await screen.findByRole("alertdialog");
    expect(dialog.contains(document.activeElement)).toBe(true);
    await user.keyboard("{Escape}");

    await waitFor(() => {
      expect(screen.queryByRole("alertdialog")).toBeNull();
    });
  });

  it("replaces the active profile after confirmation in the dialog", async () => {
    const user = userEvent.setup();
    const { store } = await setup({ withActive: true });
    const activeId = store.getState().active?.id;

    await user.click(screen.getByRole("button", { name: en("editor_confirm") }));
    await user.click(await screen.findByRole("button", { name: en("replace_confirm") }));

    await waitFor(() => {
      expect(store.getState().draft).toBeNull();
    });
    expect(store.getState().active?.id).not.toBe(activeId);
  });

  it("keeps Generate disabled with a hint until a profile is confirmed", async () => {
    await setup();
    const generate = screen.getByRole("button", { name: en("generate_button") });

    expect((generate as HTMLButtonElement).disabled).toBe(true);
    expect(generate.getAttribute("aria-describedby")).toBeTruthy();
    expect(screen.getByText(en("generate_confirm_first"))).toBeTruthy();
  });

  it("stores a valid photo and rejects other files with a message", async () => {
    const { files } = await setup();
    const input = screen.getByLabelText(en("photo_label"));

    fireEvent.change(input, { target: { files: [pdfFile("me.png")] } });
    expect(await screen.findByText(en("photo_error_type"))).toBeTruthy();

    fireEvent.change(input, { target: { files: [bytesFile(PNG_HEAD, "me.png", "image/png")] } });
    await waitFor(() => {
      expect(files.files.has("photo")).toBe(true);
    });
  });

  it("labels every text input for screen readers", async () => {
    await setup();

    const unlabelled = [...document.querySelectorAll("input, textarea")].filter((element) => {
      const id = element.getAttribute("id");
      const hasLabel = id !== null && document.querySelector(`label[for="${id}"]`) !== null;
      return (
        !hasLabel && !element.getAttribute("aria-label") && !element.getAttribute("aria-labelledby")
      );
    });
    expect(unlabelled).toEqual([]);
  });
});
