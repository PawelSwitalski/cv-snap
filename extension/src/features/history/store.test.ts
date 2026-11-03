import { describe, expect, it } from "vitest";
import { historyEntry } from "../../../test/history-fixtures";
import { generationResult } from "../../../test/generate-fixtures";
import { createMemoryHistoryRepository } from "./history-repository";
import { createHistoryStore, todayLocal, visibleEntries } from "./store";

const ENTRIES = [
  historyEntry({ adKey: "a", company: "Łódzka Spółka", title: "Frontend Developer" }),
  historyEntry({ adKey: "b", company: "Acme", title: "Żółć Engineer", sentOn: "2026-11-02" }),
  historyEntry({ adKey: "c", company: null, title: "Backend Developer" }),
];

describe("visibleEntries", () => {
  it("matches company or title, ignoring case and Polish letters", () => {
    expect(visibleEntries(ENTRIES, "lodzka", "all").map((e) => e.adKey)).toEqual(["a"]);
    expect(visibleEntries(ENTRIES, "ZOLC", "all").map((e) => e.adKey)).toEqual(["b"]);
    expect(visibleEntries(ENTRIES, "developer", "all").map((e) => e.adKey)).toEqual(["a", "c"]);
    expect(visibleEntries(ENTRIES, "  ", "all")).toHaveLength(3);
  });

  it("filters by sent status, combined with the search", () => {
    expect(visibleEntries(ENTRIES, "", "sent").map((e) => e.adKey)).toEqual(["b"]);
    expect(visibleEntries(ENTRIES, "", "not-sent").map((e) => e.adKey)).toEqual(["a", "c"]);
    expect(visibleEntries(ENTRIES, "acme", "not-sent")).toEqual([]);
  });
});

describe("todayLocal", () => {
  it("is the local calendar date, zero-padded", () => {
    expect(todayLocal(new Date(2026, 0, 5, 23, 59))).toBe("2026-01-05");
    expect(todayLocal(new Date(2026, 10, 3, 0, 1))).toBe("2026-11-03");
  });
});

describe("history store", () => {
  async function loaded() {
    const repository = createMemoryHistoryRepository();
    for (const entry of ENTRIES)
      await repository.put(entry, { pdf: new Blob(["%PDF"]), adText: "a" });
    const store = createHistoryStore(repository);
    await store.getState().load();
    return { repository, store };
  }

  it("loads the entries and how many couldn't be read", async () => {
    const repository = createMemoryHistoryRepository();
    repository.meta.set("broken", "not an entry");
    const store = createHistoryStore(repository);

    await store.getState().load();

    expect(store.getState()).toMatchObject({ status: "ready", entries: [], unreadable: 1 });
  });

  it("reports a failed load", async () => {
    const store = createHistoryStore({
      ...createMemoryHistoryRepository(),
      list: () => Promise.reject(new Error("UnknownError")),
    });

    await store.getState().load();

    expect(store.getState().status).toBe("failed");
  });

  it("marks an entry as sent and not sent, and every reader sees it", async () => {
    const { repository, store } = await loaded();

    await store.getState().setSentOn("a", "2026-11-01");
    expect(store.getState().entries.find((e) => e.adKey === "a")?.sentOn).toBe("2026-11-01");
    expect((await repository.get("a"))?.sentOn).toBe("2026-11-01");

    await store.getState().setSentOn("a", null);
    expect((await repository.get("a"))?.sentOn).toBeNull();
  });

  it("refuses a sent date in the future", async () => {
    const { repository, store } = await loaded();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    await expect(store.getState().setSentOn("a", todayLocal(tomorrow))).rejects.toThrow(RangeError);
    expect((await repository.get("a"))?.sentOn).toBeNull();
  });

  it("deletes an entry and drops it from the list", async () => {
    const { repository, store } = await loaded();

    await store.getState().remove("b");

    expect(store.getState().entries.map((e) => e.adKey)).not.toContain("b");
    await expect(repository.get("b")).resolves.toBeNull();
  });

  it("refreshes the list after a download is recorded", async () => {
    const { store } = await loaded();
    const result = {
      ...generationResult(),
      ad: {
        adKey: "new",
        url: null,
        text: "t",
        isManualSelection: true,
        snapshot: "none" as const,
      },
    };

    await expect(
      store
        .getState()
        .recordDownload({ result, fileName: "CV.pdf", pdf: new Blob(["%PDF"]), now: new Date() }),
    ).resolves.toBe("saved");

    expect(store.getState().entries[0]?.adKey).toBe("new");
  });

  it("keeps the search and filter", () => {
    const store = createHistoryStore(createMemoryHistoryRepository());

    store.getState().setQuery("acme");
    store.getState().setFilter("sent");

    expect(store.getState()).toMatchObject({ query: "acme", filter: "sent" });
  });
});
