import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { useStore } from "zustand";
import { historyEntry } from "../../../test/history-fixtures";
import { I18nProvider } from "@/lib/i18n/i18n";
import { formatMessage, type MessageKey } from "@/lib/i18n/messages";
import { createMemoryStore } from "@/lib/storage/local-store";
import { createMemoryHistoryRepository } from "./history-repository";
import { formatCalendarDate, SentStatus } from "./SentStatus";
import { createHistoryStore, todayLocal, type HistoryStore } from "./store";

const en = (key: MessageKey, ...subs: string[]) => formatMessage("en", key, subs);

/** Renders the status of the store's entry, re-rendering when it changes (as the views do). */
function Bound({ store, adKey }: { store: HistoryStore; adKey: string }) {
  const entry = useStore(store, (state) => state.entries.find((e) => e.adKey === adKey));
  return entry ? <SentStatus entry={entry} store={store} /> : null;
}

async function setup(sentOn: string | null = null) {
  const repository = createMemoryHistoryRepository();
  await repository.put(historyEntry({ sentOn }), { pdf: new Blob(["%PDF"]), adText: "a" });
  const store = createHistoryStore(repository);
  await store.getState().load();
  render(
    <I18nProvider store={createMemoryStore()} browserLanguage="en-US">
      <Bound store={store} adKey={historyEntry().adKey} />
    </I18nProvider>,
  );
  return { repository, user: userEvent.setup() };
}

describe("SentStatus", () => {
  it("marks as sent today", async () => {
    const ctx = await setup();

    await ctx.user.click(screen.getByRole("button", { name: en("sent_mark") }));

    const today = todayLocal();
    expect(await screen.findByText(en("sent_on", formatCalendarDate(today, "en-US")))).toBeTruthy();
    expect((await ctx.repository.get(historyEntry().adKey))?.sentOn).toBe(today);
  });

  it("changes the date, but never to the future", async () => {
    const ctx = await setup("2026-11-01");
    const field = screen.getByLabelText<HTMLInputElement>(en("sent_date_label"));
    expect(field.max).toBe(todayLocal());

    fireEvent.change(field, { target: { value: "2026-10-20" } });
    await waitFor(async () => {
      expect((await ctx.repository.get(historyEntry().adKey))?.sentOn).toBe("2026-10-20");
    });

    fireEvent.change(screen.getByLabelText(en("sent_date_label")), {
      target: { value: "2999-01-01" },
    });
    expect((await ctx.repository.get(historyEntry().adKey))?.sentOn).toBe("2026-10-20");
  });

  it("marks as not sent, clearing the date", async () => {
    const ctx = await setup("2026-11-01");

    await ctx.user.click(screen.getByRole("button", { name: en("sent_unmark") }));

    expect(await screen.findByRole("button", { name: en("sent_mark") })).toBeTruthy();
    expect((await ctx.repository.get(historyEntry().adKey))?.sentOn).toBeNull();
  });
});

describe("formatCalendarDate", () => {
  it("formats a calendar date without shifting it by time zone", () => {
    expect(formatCalendarDate("2026-11-03", "en-US")).toBe("November 3, 2026");
    expect(formatCalendarDate("2026-01-01", "pl")).toBe("1 stycznia 2026");
  });
});
