import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { historyEntry } from "../../../test/history-fixtures";
import { I18nProvider } from "@/lib/i18n/i18n";
import { formatMessage, type MessageKey } from "@/lib/i18n/messages";
import { createMemoryStore } from "@/lib/storage/local-store";
import type { HistoryEntry } from "./history-entry";
import { createMemoryHistoryRepository } from "./history-repository";
import HistoryView, { HISTORY_PAGE_SIZE, historyRowId, type HistoryActions } from "./HistoryView";
import { createHistoryStore } from "./store";

const en = (key: MessageKey, ...subs: string[]) => formatMessage("en", key, subs);

async function setup(entries: HistoryEntry[], options: { focusAdKey?: string } = {}) {
  const repository = createMemoryHistoryRepository();
  for (const entry of entries) {
    await repository.put(entry, { pdf: new Blob(["%PDF"]), adText: "ad" });
  }
  const store = createHistoryStore(repository);
  const openPdf = vi.fn(() => Promise.resolve(true));
  const openPage = vi.fn(() => Promise.resolve());
  const openUrl = vi.fn(() => Promise.resolve());
  const actions: HistoryActions = { openPdf, openPage, openUrl };
  const onBack = vi.fn();
  render(
    <I18nProvider store={createMemoryStore()} browserLanguage="en-US">
      <HistoryView
        store={store}
        actions={actions}
        onBack={onBack}
        {...(options.focusAdKey ? { focusAdKey: options.focusAdKey } : {})}
      />
    </I18nProvider>,
  );
  return { repository, store, openPdf, openPage, openUrl, onBack, user: userEvent.setup() };
}

const manyEntries = (count: number) =>
  Array.from({ length: count }, (_, index) =>
    historyEntry({
      adKey: `ad-${String(index)}`,
      company: `Company ${String(index)}`,
      lastDownloadedAt: new Date(Date.UTC(2026, 0, 1) + index * 60_000).toISOString(),
    }),
  );

const rows = () => screen.queryAllByRole("listitem");
const row = (text: string) => {
  const match = rows().find((item) => item.textContent.includes(text));
  if (!match) throw new Error(`no row with ${text}`);
  return within(match);
};

describe("HistoryView", () => {
  it("lists entries newest first with company, title, date and sent status", async () => {
    await setup([
      historyEntry({
        adKey: "old",
        company: "Old Co",
        lastDownloadedAt: "2026-10-01T10:00:00.000Z",
      }),
      historyEntry({
        adKey: "new",
        company: "New Co",
        title: "Tester",
        lastDownloadedAt: "2026-11-02T10:00:00.000Z",
        sentOn: "2026-11-03",
      }),
    ]);

    await waitFor(() => {
      expect(rows()).toHaveLength(2);
    });
    expect(rows()[0]?.textContent).toContain("New Co");
    expect(row("New Co").getByText("Tester")).toBeTruthy();
    expect(row("New Co").getByText(en("history_downloaded_on", "Nov 2, 2026"))).toBeTruthy();
    expect(row("New Co").getByText(en("sent_on", "November 3, 2026"))).toBeTruthy();
    expect(row("Old Co").getByText(en("sent_not_sent"))).toBeTruthy();
  });

  it("names an entry by its host, or as untitled, when the company is unknown", async () => {
    await setup([
      historyEntry({ adKey: "a", company: null, url: "https://jobs.example.com/1" }),
      historyEntry({ adKey: "b", company: null, url: null, title: "" }),
    ]);

    expect(await screen.findByText("jobs.example.com")).toBeTruthy();
    expect(screen.getByText(en("history_untitled"))).toBeTruthy();
  });

  it("searches ignoring case and diacritics, filters by status, and clears a search without matches", async () => {
    const ctx = await setup([
      historyEntry({ adKey: "a", company: "Łódzka Spółka" }),
      historyEntry({ adKey: "b", company: "Acme", sentOn: "2026-11-02" }),
    ]);
    await waitFor(() => {
      expect(rows()).toHaveLength(2);
    });

    await ctx.user.type(screen.getByLabelText(en("history_search")), "LODZKA");
    expect(rows().map((item) => item.textContent)).toEqual([expect.stringContaining("Łódzka")]);

    await ctx.user.clear(screen.getByLabelText(en("history_search")));
    await ctx.user.selectOptions(screen.getByLabelText(en("history_filter")), "sent");
    expect(rows()).toHaveLength(1);
    expect(rows()[0]?.textContent).toContain("Acme");

    await ctx.user.type(screen.getByLabelText(en("history_search")), "zzz");
    expect(screen.getByText(en("history_no_match"))).toBeTruthy();
    await ctx.user.click(screen.getByRole("button", { name: en("history_clear_search") }));
    expect(rows()).toHaveLength(2);
  });

  it("opens the PDF, the saved page and the original ad of a row", async () => {
    const ctx = await setup([historyEntry({ adKey: "a", url: "https://jobs.example.com/1" })]);
    await waitFor(() => {
      expect(rows()).toHaveLength(1);
    });

    await ctx.user.click(row("Acme").getByRole("button", { name: en("history_open_pdf") }));
    await ctx.user.click(row("Acme").getByRole("button", { name: en("history_open_page") }));
    await ctx.user.click(row("Acme").getByRole("button", { name: en("history_open_ad") }));

    expect(ctx.openPdf).toHaveBeenCalledWith("a");
    expect(ctx.openPage).toHaveBeenCalledWith("a");
    expect(ctx.openUrl).toHaveBeenCalledWith("https://jobs.example.com/1");
  });

  it("offers no 'open original ad' without an address", async () => {
    await setup([historyEntry({ url: null })]);
    await waitFor(() => {
      expect(rows()).toHaveLength(1);
    });

    expect(screen.queryByRole("button", { name: en("history_open_ad") })).toBeNull();
  });

  it("describes each row button by its ad, for screen readers", async () => {
    await setup([historyEntry({ company: "Acme" })]);

    const button = await screen.findByRole("button", { name: en("history_delete") });

    expect(button.getAttribute("aria-describedby")).toBeTruthy();
    expect(
      document.getElementById(button.getAttribute("aria-describedby") ?? "")?.textContent,
    ).toBe("Acme");
  });

  it("deletes an entry only after confirming", async () => {
    const ctx = await setup([historyEntry({ adKey: "a" })]);
    await waitFor(() => {
      expect(rows()).toHaveLength(1);
    });

    await ctx.user.click(screen.getByRole("button", { name: en("history_delete") }));
    await ctx.user.click(screen.getByRole("button", { name: en("history_delete_keep") }));
    expect(rows()).toHaveLength(1);

    await ctx.user.click(screen.getByRole("button", { name: en("history_delete") }));
    await ctx.user.click(screen.getByRole("button", { name: en("history_delete_confirm") }));

    expect(await screen.findByText(en("history_empty"))).toBeTruthy();
    await expect(ctx.repository.get("a")).resolves.toBeNull();
  });

  it("marks an entry as sent from its row", async () => {
    const ctx = await setup([historyEntry({ adKey: "a" })]);
    await waitFor(() => {
      expect(rows()).toHaveLength(1);
    });

    await ctx.user.click(screen.getByRole("button", { name: en("sent_mark") }));

    await waitFor(() => {
      expect(row("Acme").queryByText(en("sent_not_sent"))).toBeNull();
    });
    expect((await ctx.repository.get("a"))?.sentOn).not.toBeNull();
  });

  it("explains an empty history and notes unreadable entries", async () => {
    const repository = createMemoryHistoryRepository();
    repository.meta.set("broken", { schemaVersion: 99 });
    const store = createHistoryStore(repository);
    render(
      <I18nProvider store={createMemoryStore()} browserLanguage="en-US">
        <HistoryView
          store={store}
          actions={{ openPdf: vi.fn(), openPage: vi.fn(), openUrl: vi.fn() }}
          onBack={vi.fn()}
        />
      </I18nProvider>,
    );

    expect(await screen.findByText(en("history_empty"))).toBeTruthy();
    expect(screen.getByText(en("history_unreadable", "1"))).toBeTruthy();
  });

  it("goes back", async () => {
    const ctx = await setup([]);

    await ctx.user.click(screen.getByRole("button", { name: en("action_back") }));

    expect(ctx.onBack).toHaveBeenCalledTimes(1);
  });

  it("focuses the entry the hint asked for", async () => {
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
    await setup([historyEntry({ adKey: "a" }), historyEntry({ adKey: "b", company: "Other" })], {
      focusAdKey: "b",
    });

    await waitFor(() => {
      expect(document.activeElement?.id).toBe(historyRowId("b"));
    });
    expect(scrollIntoView).toHaveBeenCalled();
  });

  it("shows the first 50 of 500 entries at once, then more on request", async () => {
    const ctx = await setup(manyEntries(500));

    await waitFor(() => {
      expect(rows()).toHaveLength(HISTORY_PAGE_SIZE);
    });
    expect(rows()[0]?.textContent).toContain("Company 499");

    await ctx.user.click(
      screen.getByRole("button", { name: en("history_show_more", "50", "450") }),
    );
    expect(rows()).toHaveLength(100);
  });

  it("searches all 500 entries, not only the rows shown", async () => {
    const ctx = await setup(manyEntries(500));
    await waitFor(() => {
      expect(rows()).toHaveLength(HISTORY_PAGE_SIZE);
    });

    await ctx.user.type(screen.getByLabelText(en("history_search")), "Company 7");

    // Company 7, 70–79, 700+ don't exist: 7 and 70–79 match.
    expect(rows()).toHaveLength(11);
  });

  it("renders the entry the hint asked for even beyond the first page", async () => {
    Element.prototype.scrollIntoView = vi.fn();
    await setup(manyEntries(500), { focusAdKey: "ad-3" });

    await waitFor(() => {
      expect(document.activeElement?.id).toBe(historyRowId("ad-3"));
    });
  });

  it("labels each entry as the user's own CV or a tailored one (intent 005)", async () => {
    await setup([
      historyEntry({ adKey: "own", company: "Own Co", source: "own" }),
      historyEntry({ adKey: "tailored", company: "Tailored Co", source: "tailored" }),
      historyEntry({ adKey: "old", company: "Old Co" }),
    ]);
    await screen.findByText("Own Co");

    expect(row("Own Co").getByText(en("history_source_own"))).toBeTruthy();
    expect(row("Own Co").getByText(en("history_saved_on", "Nov 1, 2026"))).toBeTruthy();
    expect(row("Tailored Co").getByText(en("history_source_tailored"))).toBeTruthy();
    // An entry from 0.2.0 has no source: it was a tailored download.
    expect(row("Old Co").getByText(en("history_source_tailored"))).toBeTruthy();
    expect(row("Old Co").getByText(en("history_downloaded_on", "Nov 1, 2026"))).toBeTruthy();
  });
});
