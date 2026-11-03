import { act, render, renderHook, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { historyEntry } from "../../../test/history-fixtures";
import type { PageState } from "@/features/generate/page-state";
import { I18nProvider } from "@/lib/i18n/i18n";
import { formatMessage, type MessageKey } from "@/lib/i18n/messages";
import { createMemoryStore } from "@/lib/storage/local-store";
import { createMemoryHistoryRepository } from "./history-repository";
import { HINT_DEBOUNCE_MS, HistoryHint, usePageAdKey } from "./HistoryHint";
import { createHistoryStore } from "./store";

const en = (key: MessageKey, ...subs: string[]) => formatMessage("en", key, subs);

const detected = (tabId: number, url = "https://jobs.example.com/1"): PageState => ({
  kind: "ad-detected",
  tabId,
  url,
});

describe("usePageAdKey", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("reads the ad's key once the tab has settled", async () => {
    const adKeyOfTab = vi.fn(() => Promise.resolve("key-7"));
    const { result } = renderHook(() => usePageAdKey(detected(7), adKeyOfTab));

    expect(adKeyOfTab).not.toHaveBeenCalled();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(HINT_DEBOUNCE_MS);
    });

    expect(adKeyOfTab).toHaveBeenCalledWith(7);
    expect(result.current).toBe("key-7");
  });

  it("reads nothing where no ad is detected", async () => {
    const adKeyOfTab = vi.fn(() => Promise.resolve("key"));
    const { result } = renderHook(() =>
      usePageAdKey({ kind: "no-ad", tabId: 7, url: "https://a.pl" }, adKeyOfTab),
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(HINT_DEBOUNCE_MS * 2);
    });

    expect(adKeyOfTab).not.toHaveBeenCalled();
    expect(result.current).toBeNull();
  });

  it("reads the new ad after a switch and never shows the old one's key", async () => {
    const adKeyOfTab = vi.fn((tabId: number) => Promise.resolve(`key-${String(tabId)}`));
    const { result, rerender } = renderHook(({ state }) => usePageAdKey(state, adKeyOfTab), {
      initialProps: { state: detected(1) },
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(HINT_DEBOUNCE_MS);
    });
    expect(result.current).toBe("key-1");

    rerender({ state: detected(2) });
    expect(result.current).toBeNull();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(HINT_DEBOUNCE_MS);
    });

    expect(result.current).toBe("key-2");
  });

  it("re-reads after an in-page navigation of the same tab", async () => {
    const adKeyOfTab = vi.fn(() => Promise.resolve("key"));
    const { rerender } = renderHook(({ state }) => usePageAdKey(state, adKeyOfTab), {
      initialProps: { state: detected(1, "https://a.pl/1") },
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(HINT_DEBOUNCE_MS);
    });

    rerender({ state: detected(1, "https://a.pl/2") });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(HINT_DEBOUNCE_MS);
    });

    expect(adKeyOfTab).toHaveBeenCalledTimes(2);
  });

  it("gives no key when the ad can't be read", async () => {
    const { result } = renderHook(() =>
      usePageAdKey(detected(7), () => Promise.reject(new Error("no content script"))),
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(HINT_DEBOUNCE_MS);
    });

    expect(result.current).toBeNull();
  });
});

describe("HistoryHint", () => {
  async function show(adKey: string | null, sentOn: string | null = null) {
    const repository = createMemoryHistoryRepository();
    await repository.put(historyEntry({ sentOn, lastDownloadedAt: "2026-11-01T10:00:00.000Z" }), {
      pdf: new Blob(["%PDF"]),
      adText: "a",
    });
    const store = createHistoryStore(repository);
    await store.getState().load();
    const onShow = vi.fn();
    render(
      <I18nProvider store={createMemoryStore()} browserLanguage="en-US">
        <HistoryHint store={store} adKey={adKey} onShow={onShow} />
      </I18nProvider>,
    );
    return { onShow, user: userEvent.setup() };
  }

  it("says when the CV for this ad was downloaded, and links to the entry", async () => {
    const ctx = await show(historyEntry().adKey);

    expect(
      screen.getByText(en("hint_downloaded", "November 1, 2026"), { exact: false }),
    ).toBeTruthy();
    await ctx.user.click(screen.getByRole("button", { name: en("hint_show") }));

    expect(ctx.onShow).toHaveBeenCalledWith(historyEntry().adKey);
  });

  it("also says when it was sent", async () => {
    await show(historyEntry().adKey, "2026-11-02");

    expect(
      screen.getByText(en("hint_sent", "November 1, 2026", "November 2, 2026"), { exact: false }),
    ).toBeTruthy();
  });

  it.each([
    ["an ad without an entry (another offer at the same URL)", "https://jobs.example.com/1#other"],
    ["no ad", null],
  ])("shows nothing for %s", async (_label, adKey) => {
    await show(adKey);

    expect(screen.queryByRole("button", { name: en("hint_show") })).toBeNull();
  });
});
