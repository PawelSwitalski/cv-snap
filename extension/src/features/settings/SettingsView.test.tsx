import "fake-indexeddb/auto";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { smallProfile } from "../../../test/cv-fixtures";
import { AD_URL, adPageFacts, fakePageStateApis } from "../../../test/generate-fixtures";
import { PNG_HEAD, bytesFile } from "../../../test/panel-fixtures";
import { fakeAllowedSites } from "../../../test/settings-fixtures";
import type { PageFacts } from "@/features/generate/page-state";
import { buildBackup } from "@/features/profile/backup";
import { ChromeStorageProfileRepository } from "@/features/profile/profile-repository";
import { createProfileStore } from "@/features/profile/store";
import {
  DEFAULT_GDPR_CLAUSE_PL,
  DEFAULT_GDPR_CLAUSE_SETTINGS,
} from "@/features/cv-pdf/gdpr-clause";
import { I18nProvider } from "@/lib/i18n/i18n";
import { formatMessage, type MessageKey } from "@/lib/i18n/messages";
import { createMemoryFileStore, FILE_KEYS } from "@/lib/storage/file-store";
import { createMemoryStore, STORAGE_KEYS } from "@/lib/storage/local-store";
import SettingsView from "./SettingsView";
import { createSettingsStore } from "./store";

const en = (key: MessageKey, ...subs: string[]) => formatMessage("en", key, subs);
const pl = (key: MessageKey, ...subs: string[]) => formatMessage("pl", key, subs);

async function setup(
  options: {
    facts?: PageFacts;
    sites?: ReturnType<typeof fakeAllowedSites>;
    withActive?: boolean;
    isGenerating?: boolean;
  } = {},
) {
  const memory = createMemoryStore(
    options.withActive === false ? {} : { [STORAGE_KEYS.activeProfile]: smallProfile() },
  );
  const files = createMemoryFileStore();
  const settings = createSettingsStore(memory);
  await settings.getState().load();
  const profiles = createProfileStore({
    repository: new ChromeStorageProfileRepository(memory),
    files,
  });
  await profiles.getState().load();
  const sites = options.sites ?? fakeAllowedSites();
  const download = vi.fn<(file: Blob, fileName: string) => void>();
  const onBack = vi.fn();
  const onShowPrivacy = vi.fn();
  render(
    <I18nProvider store={memory} browserLanguage="en-US">
      <SettingsView
        deps={{
          settings,
          sites: {
            allowedSites: sites,
            pageStateApis: fakePageStateApis(options.facts ?? adPageFacts()).apis,
          },
          backup: {
            profiles,
            isGenerating: () => options.isGenerating ?? false,
            subscribeGenerating: () => () => undefined,
            download,
          },
        }}
        onBack={onBack}
        onShowPrivacy={onShowPrivacy}
      />
    </I18nProvider>,
  );
  return {
    memory,
    files,
    settings,
    profiles,
    sites,
    download,
    onBack,
    onShowPrivacy,
    user: userEvent.setup(),
  };
}

const section = (key: MessageKey) => screen.getByRole("region", { name: en(key) });

describe("SettingsView", () => {
  it("offers the three models with trade-off notes and stores the choice", async () => {
    const ctx = await setup();
    const models = section("settings_model");

    const sonnet = within(models).getByRole<HTMLInputElement>("radio", {
      name: en("settings_model_sonnet"),
    });
    expect(sonnet.checked).toBe(true);
    expect(within(models).getByText(en("settings_model_opus_note"))).toBeTruthy();
    expect(within(models).getByText(en("settings_model_haiku_note"))).toBeTruthy();

    await ctx.user.click(within(models).getByRole("radio", { name: en("settings_model_opus") }));

    expect(ctx.settings.getState().model).toBe("claude-opus-5-5");
    expect(ctx.memory.data.get(STORAGE_KEYS.model)).toBe("claude-opus-5-5");
  });

  it("switches the panel language immediately", async () => {
    const ctx = await setup();

    await ctx.user.selectOptions(
      within(section("settings_language")).getByLabelText(en("language_label")),
      "pl",
    );

    expect(await screen.findByRole("heading", { name: pl("settings_title") })).toBeTruthy();
    expect(ctx.memory.data.get(STORAGE_KEYS.uiLanguage)).toBe("pl");
  });

  it("edits the GDPR clause mode and texts, and restores the default texts", async () => {
    const ctx = await setup();
    const gdpr = section("settings_gdpr");

    await ctx.user.click(
      within(gdpr).getByRole("radio", { name: en("settings_gdpr_mode_always") }),
    );
    const polish = within(gdpr).getByLabelText(en("settings_gdpr_text_pl"));
    await ctx.user.clear(polish);
    await ctx.user.type(polish, "Moja klauzula.");

    expect(ctx.settings.getState().gdprClause).toEqual({
      mode: "always",
      textPl: "Moja klauzula.",
      textEn: DEFAULT_GDPR_CLAUSE_SETTINGS.textEn,
    });

    await ctx.user.click(within(gdpr).getByRole("button", { name: en("settings_gdpr_restore") }));
    expect(ctx.settings.getState().gdprClause.textPl).toBe(DEFAULT_GDPR_CLAUSE_PL);
    expect(ctx.settings.getState().gdprClause.mode).toBe("always");
  });

  it("opens the privacy notice and goes back", async () => {
    const ctx = await setup();

    await ctx.user.click(screen.getByRole("button", { name: en("settings_privacy_show") }));
    await ctx.user.click(screen.getByRole("button", { name: en("settings_back") }));

    expect(ctx.onShowPrivacy).toHaveBeenCalledTimes(1);
    expect(ctx.onBack).toHaveBeenCalledTimes(1);
  });

  describe("allowed sites", () => {
    it("lists sites, removes one (revoking access) and hides added presets", async () => {
      const sites = fakeAllowedSites({
        sites: [
          {
            pattern: "https://*.pracuj.pl/*",
            label: "Pracuj.pl",
            presetId: "pracuj",
            addedAt: null,
          },
        ],
      });
      const ctx = await setup({ sites });
      const region = section("settings_sites");

      expect(await within(region).findByText("Pracuj.pl")).toBeTruthy();
      expect(
        within(region).queryByRole("button", {
          name: en("settings_sites_add_preset", "Pracuj.pl"),
        }),
      ).toBeNull();

      await ctx.user.click(
        within(region).getByRole("button", { name: en("settings_sites_remove", "Pracuj.pl") }),
      );

      expect(sites.calls).toEqual(["remove:https://*.pracuj.pl/*"]);
      expect(await within(region).findByText(en("settings_sites_empty"))).toBeTruthy();
    });

    it("adds a preset and the current site", async () => {
      const ctx = await setup({
        facts: { ...adPageFacts(), grantedPatterns: [], jobAdStatus: null },
      });
      const region = section("settings_sites");

      await ctx.user.click(
        await within(region).findByRole("button", {
          name: en("settings_sites_add_preset", "LinkedIn"),
        }),
      );
      await ctx.user.click(within(region).getByRole("button", { name: en("generate_add_site") }));

      expect(ctx.sites.calls).toEqual(["preset:linkedin", `tab:${AD_URL}`]);
      await waitFor(() => {
        expect(within(region).getByText("LinkedIn")).toBeTruthy();
      });
    });

    it("says so when Chrome access is refused", async () => {
      const ctx = await setup({ sites: fakeAllowedSites({ grant: false }) });

      await ctx.user.click(
        await screen.findByRole("button", { name: en("settings_sites_add_preset", "Indeed") }),
      );

      expect(await screen.findByText(en("settings_sites_denied"))).toBeTruthy();
    });

    it("asks for a click on the icon when Chrome hides the tab's address", async () => {
      await setup({ facts: { ...adPageFacts(), tab: { id: 7, url: undefined } } });

      expect(await screen.findByText(en("generate_click_icon"))).toBeTruthy();
    });
  });

  describe("profile backup", () => {
    it("exports the profile without the photo unless asked", async () => {
      const ctx = await setup();
      await ctx.profiles.getState().setPhoto(bytesFile(PNG_HEAD, "me.png", "image/png"));

      await ctx.user.click(screen.getByRole("button", { name: en("backup_export") }));
      await waitFor(() => {
        expect(ctx.download).toHaveBeenCalledTimes(1);
      });
      const [file, name] = ctx.download.mock.calls[0] ?? [];
      const exported = JSON.parse((await file?.text()) ?? "{}") as Record<string, unknown>;
      expect(name).toMatch(/^cv-snap-profile-\d{4}-\d{2}-\d{2}\.json$/);
      expect(exported).toMatchObject({ format: "cv-snap-profile", schemaVersion: 1 });
      expect(exported.photo).toBeUndefined();

      await ctx.user.click(screen.getByLabelText(en("backup_include_photo")));
      await ctx.user.click(screen.getByRole("button", { name: en("backup_export") }));
      await waitFor(() => {
        expect(ctx.download).toHaveBeenCalledTimes(2);
      });
      const withPhoto = JSON.parse(
        (await ctx.download.mock.calls[1]?.[0].text()) ?? "{}",
      ) as Record<string, unknown>;
      expect(withPhoto.photo).toMatchObject({ type: "image/png" });
    });

    it("can't export before a profile is confirmed", async () => {
      await setup({ withActive: false });

      expect(
        screen.getByRole<HTMLButtonElement>("button", { name: en("backup_export") }).disabled,
      ).toBe(true);
      expect(screen.getByText(en("backup_no_profile"))).toBeTruthy();
    });

    it("asks before replacing the profile, then makes the import active", async () => {
      const ctx = await setup();
      const imported = { ...smallProfile(), id: "prof_imported" };
      imported.contact.fullName = "Anna Importowa";
      const file = new File([JSON.stringify(await buildBackup(imported, null))], "backup.json", {
        type: "application/json",
      });

      await ctx.user.upload(screen.getByLabelText(en("backup_import")), file);
      const dialog = await screen.findByRole("alertdialog");
      expect(dialog.textContent).toContain(en("backup_confirm_description", "Anna Importowa"));
      await ctx.user.click(
        within(dialog).getByRole("button", { name: en("backup_confirm_replace") }),
      );

      expect(await screen.findByText(en("backup_imported"))).toBeTruthy();
      expect(ctx.profiles.getState().active?.id).toBe("prof_imported");
      expect(ctx.files.files.has(FILE_KEYS.photo)).toBe(false);
    });

    it("keeps the current profile when the user declines", async () => {
      const ctx = await setup();
      const file = new File(
        [JSON.stringify(await buildBackup({ ...smallProfile(), id: "prof_other" }, null))],
        "backup.json",
      );

      await ctx.user.upload(screen.getByLabelText(en("backup_import")), file);
      await ctx.user.click(await screen.findByRole("button", { name: en("backup_confirm_keep") }));

      expect(ctx.profiles.getState().active?.id).toBe(smallProfile().id);
    });

    it("rejects an invalid or newer-version file with a message", async () => {
      const ctx = await setup();

      await ctx.user.upload(
        screen.getByLabelText(en("backup_import")),
        new File(["{ nope"], "notes.json"),
      );
      expect((await screen.findByRole("alert")).textContent).toBe(en("backup_error_not_a_backup"));

      const newer = { ...(await buildBackup(smallProfile(), null)), schemaVersion: 99 };
      await ctx.user.upload(
        screen.getByLabelText(en("backup_import")),
        new File([JSON.stringify(newer)], "newer.json"),
      );
      expect((await screen.findByRole("alert")).textContent).toBe(en("backup_error_newer_version"));
      expect(screen.queryByRole("alertdialog")).toBeNull();
    });

    it("blocks import while a generation runs", async () => {
      await setup({ isGenerating: true });

      expect(
        screen.getByRole<HTMLButtonElement>("button", { name: en("backup_import") }).disabled,
      ).toBe(true);
      expect(screen.getByText(en("backup_blocked_generating"))).toBeTruthy();
    });
  });
});
