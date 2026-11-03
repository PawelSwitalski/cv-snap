import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { historyEntry } from "../../../test/history-fixtures";
import { createMemoryHistoryRepository } from "@/features/history/history-repository";
import { createHistoryStore } from "@/features/history/store";
import { I18nProvider } from "@/lib/i18n/i18n";
import { formatMessage, type MessageKey } from "@/lib/i18n/messages";
import { createMemoryStore, STORAGE_KEYS } from "@/lib/storage/local-store";
import { HistorySection } from "./HistorySection";
import { createSettingsStore } from "./store";

const en = (key: MessageKey, ...subs: string[]) => formatMessage("en", key, subs);
const NOW = new Date("2026-11-03T12:00:00.000Z");
const MB = 1024 * 1024;

/** Entries last downloaded 400, 100 and 5 days before NOW, each 0.5 MB. */
async function setup(stored: Record<string, unknown> = {}) {
  const repository = createMemoryHistoryRepository();
  for (const days of [400, 100, 5]) {
    const lastDownloadedAt = new Date(NOW.getTime() - days * 86_400_000).toISOString();
    await repository.put(
      historyEntry({
        adKey: `ad-${String(days)}`,
        lastDownloadedAt,
        sizes: { pdf: MB / 2, snapshot: 0, adText: 0 },
      }),
      { pdf: new Blob(["%PDF"]), adText: "a" },
    );
  }
  const local = createMemoryStore(stored);
  const settings = createSettingsStore(local);
  await settings.getState().load();
  const history = createHistoryStore(repository);
  render(
    <I18nProvider store={createMemoryStore()} browserLanguage="en-US">
      <HistorySection deps={{ settings, history, now: () => NOW }} />
    </I18nProvider>,
  );
  return { repository, local, settings, user: userEvent.setup() };
}

const remaining = async (repository: ReturnType<typeof createMemoryHistoryRepository>) =>
  (await repository.list()).entries.map((entry) => entry.adKey);

describe("HistorySection", () => {
  it("keeps forever by default and shows what the history uses", async () => {
    await setup();

    expect(screen.getByLabelText<HTMLInputElement>(en("settings_history_forever")).checked).toBe(
      true,
    );
    expect(await screen.findByText(en("settings_history_usage", "3", "1.5"))).toBeTruthy();
    expect(
      screen.getByLabelText<HTMLSelectElement>(en("settings_history_months_count")).disabled,
    ).toBe(true);
  });

  it("asks before a shorter period deletes entries, and keeps the setting on cancel", async () => {
    const ctx = await setup();
    await screen.findByText(en("settings_history_usage", "3", "1.5"));

    await ctx.user.click(screen.getByLabelText(en("settings_history_months")));

    expect(
      screen.getByText(en("settings_history_shorten_description", "1", "November 3, 2025")),
    ).toBeTruthy();
    await ctx.user.click(screen.getByRole("button", { name: en("settings_history_shorten_keep") }));

    expect(ctx.settings.getState().historyRetention).toEqual({ mode: "forever" });
    expect(await remaining(ctx.repository)).toHaveLength(3);
  });

  it("saves the period and deletes the expired entries after confirming", async () => {
    const ctx = await setup();
    await screen.findByText(en("settings_history_usage", "3", "1.5"));

    await ctx.user.click(screen.getByLabelText(en("settings_history_months")));
    await ctx.user.click(
      screen.getByRole("button", { name: en("settings_history_shorten_confirm") }),
    );

    await waitFor(async () => {
      expect(await remaining(ctx.repository)).toEqual(["ad-5", "ad-100"]);
    });
    expect(ctx.settings.getState().historyRetention).toEqual({ mode: "months", months: 12 });
    await waitFor(async () => {
      expect(await ctx.local.get(STORAGE_KEYS.historyRetention)).toEqual({
        mode: "months",
        months: 12,
      });
    });
    expect(await screen.findByText(en("settings_history_usage", "2", "1"))).toBeTruthy();
  });

  it("changes the number of months, asking again when more would go", async () => {
    const ctx = await setup({ [STORAGE_KEYS.historyRetention]: { mode: "months", months: 24 } });
    await screen.findByText(en("settings_history_usage", "3", "1.5"));

    await ctx.user.selectOptions(screen.getByLabelText(en("settings_history_months_count")), "3");
    await ctx.user.click(
      screen.getByRole("button", { name: en("settings_history_shorten_confirm") }),
    );

    await waitFor(async () => {
      expect(await remaining(ctx.repository)).toEqual(["ad-5"]);
    });
  });

  it("saves at once when nothing would be deleted", async () => {
    const ctx = await setup({ [STORAGE_KEYS.historyRetention]: { mode: "months", months: 3 } });
    await screen.findByText(en("settings_history_usage", "3", "1.5"));

    await ctx.user.click(screen.getByLabelText(en("settings_history_forever")));

    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(ctx.settings.getState().historyRetention).toEqual({ mode: "forever" });
  });

  it("deletes all history only after confirming", async () => {
    const ctx = await setup();
    await screen.findByText(en("settings_history_usage", "3", "1.5"));

    await ctx.user.click(screen.getByRole("button", { name: en("settings_history_clear") }));
    await ctx.user.click(screen.getByRole("button", { name: en("history_delete_keep") }));
    expect(await remaining(ctx.repository)).toHaveLength(3);

    await ctx.user.click(screen.getByRole("button", { name: en("settings_history_clear") }));
    await ctx.user.click(
      screen.getByRole("button", { name: en("settings_history_clear_confirm") }),
    );

    expect(await screen.findByText(en("settings_history_usage", "0", "0"))).toBeTruthy();
    expect(await remaining(ctx.repository)).toEqual([]);
    expect(
      screen.getByRole<HTMLButtonElement>("button", { name: en("settings_history_clear") })
        .disabled,
    ).toBe(true);
  });
});
