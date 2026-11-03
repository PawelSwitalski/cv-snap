import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { historyEntry } from "../../../test/history-fixtures";
import { I18nProvider } from "@/lib/i18n/i18n";
import { formatMessage, type MessageKey } from "@/lib/i18n/messages";
import { createMemoryStore } from "@/lib/storage/local-store";
import { createMemoryHistoryRepository } from "./history-repository";
import { SAVED_PAGE_SANDBOX, SavedPage } from "./SavedPage";

const en = (key: MessageKey, ...subs: string[]) => formatMessage("en", key, subs);
const pdf = () => new Blob(["%PDF"], { type: "application/pdf" });
/** `historyEntry()` was last downloaded on 1 November 2026. */
const SAVED_ON = "November 1, 2026";

function show(history: ReturnType<typeof createMemoryHistoryRepository>, adKey: string) {
  render(
    <I18nProvider store={createMemoryStore()} browserLanguage="en-US">
      <SavedPage adKey={adKey} history={history} />
    </I18nProvider>,
  );
}

describe("SavedPage", () => {
  it("shows the saved page in a sandbox without scripts or the extension's origin", async () => {
    const history = createMemoryHistoryRepository();
    await history.put(historyEntry(), { pdf: pdf(), adText: "ad", snapshot: "<p>Saved ad</p>" });

    show(history, historyEntry().adKey);

    const frame = await screen.findByTitle<HTMLIFrameElement>(en("history_page_title"));
    expect(frame.getAttribute("sandbox")).toBe(SAVED_PAGE_SANDBOX);
    expect(SAVED_PAGE_SANDBOX).not.toContain("allow-scripts");
    expect(SAVED_PAGE_SANDBOX).not.toContain("allow-same-origin");
    expect(frame.getAttribute("srcdoc")).toBe("<p>Saved ad</p>");
    expect(
      screen.getByText(en("history_page_banner", SAVED_ON, "https://jobs.example.com/1")),
    ).toBeTruthy();
  });

  it.each([
    ["too-large", "history_page_too_large"],
    ["none", "history_page_text_only"],
  ] as const)("shows the ad text when the snapshot is %s", async (snapshot, note) => {
    const history = createMemoryHistoryRepository();
    await history.put(historyEntry({ snapshot }), { pdf: pdf(), adText: "Wymagania: React" });

    show(history, historyEntry().adKey);

    expect(await screen.findByText(en(note))).toBeTruthy();
    expect(screen.getByText("Wymagania: React")).toBeTruthy();
    expect(screen.queryByTitle(en("history_page_title"))).toBeNull();
  });

  it("says so for a selection captured without an address", async () => {
    const history = createMemoryHistoryRepository();
    await history.put(historyEntry({ url: null, snapshot: "none" }), { pdf: pdf(), adText: "x" });

    show(history, historyEntry().adKey);

    expect(await screen.findByText(en("history_page_banner_no_url", SAVED_ON))).toBeTruthy();
  });

  it("says the entry was deleted when it's gone", async () => {
    show(createMemoryHistoryRepository(), "gone");

    expect(await screen.findByText(en("history_page_deleted"))).toBeTruthy();
  });
});
