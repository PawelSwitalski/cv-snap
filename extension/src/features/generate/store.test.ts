import { describe, expect, it } from "vitest";
import { fakeConnector, generationResult } from "../../../test/generate-fixtures";
import { createMemoryStore, SESSION_KEYS } from "@/lib/storage/local-store";
import { createGenerateStore } from "./store";

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

function setup(options: { isOnline?: boolean } = {}) {
  const connector = fakeConnector();
  const store = createGenerateStore({
    connect: connector.connect,
    model: () => "claude-opus-5-5",
    isOnline: () => options.isOnline ?? true,
  });
  return { connector, store, state: () => store.getState() };
}

describe("generate store", () => {
  it("runs from idle through progress to a result with no further input", () => {
    const { connector, store, state } = setup();

    store.getState().generate({ tabId: 7, override: null });
    expect(state().status).toEqual({ kind: "running", step: null });
    connector.last().emit({ type: "progress", step: "validating" });
    expect(state().status).toEqual({ kind: "running", step: "validating" });
    connector.last().emit({ type: "result", result: generationResult() });

    expect(state().status).toEqual({ kind: "result" });
    expect(state().result).not.toBeNull();
    expect(connector.last().posted).toEqual([
      { type: "generate", tabId: 7, override: null, model: "claude-opus-5-5" },
    ]);
  });

  it("returns to ready at once on Cancel and ignores the cancelled run", () => {
    const { connector, store, state } = setup();
    store.getState().generate({ tabId: 7, override: null });
    const port = connector.last();

    store.getState().cancel();
    port.emit({ type: "result", result: generationResult() });

    expect(state().status).toEqual({ kind: "idle" });
    expect(state().result).toBeNull();
    expect(port.state.isDisconnected).toBe(true);
  });

  it("keeps the previous result when a regeneration is cancelled", () => {
    const { connector, store, state } = setup();
    store.getState().generate({ tabId: 7, override: null });
    connector.last().emit({ type: "result", result: generationResult() });

    store.getState().regenerate("en");
    store.getState().cancel();

    expect(state().status).toEqual({ kind: "result" });
    expect(state().result).not.toBeNull();
  });

  it("regenerates the same tab with the override for that run only", () => {
    const { connector, store, state } = setup();
    store.getState().generate({ tabId: 7, override: null });
    connector.last().emit({ type: "result", result: generationResult() });

    store.getState().regenerate("en");
    expect(connector.last().posted[0]).toMatchObject({ tabId: 7, override: "en" });

    // A new click on Generate starts without the override.
    store.getState().generate({ tabId: 9, override: null });
    expect(connector.last().posted[0]).toMatchObject({ tabId: 9, override: null });
    expect(state().request).toEqual({ tabId: 9, override: null });
  });

  it("shows an error, retries the same request in one click and notes being offline", () => {
    const { connector, store, state } = setup({ isOnline: false });
    store.getState().generate({ tabId: 7, override: "de" });
    connector.last().emit({
      type: "error",
      error: { code: "GENERATION_TIMEOUT", message: "Generation took too long" },
    });

    expect(state().status).toEqual({
      kind: "error",
      error: { code: "GENERATION_TIMEOUT", message: "Generation took too long" },
      isOffline: true,
    });
    store.getState().retry();

    expect(state().status.kind).toBe("running");
    expect(connector.ports).toHaveLength(2);
    expect(connector.last().posted[0]).toMatchObject({ tabId: 7, override: "de" });
  });

  it("leaves an error back to ready, or back to the earlier result", () => {
    const { connector, store, state } = setup();
    store.getState().generate({ tabId: 7, override: null });
    connector.last().drop();
    store.getState().dismissError();
    expect(state().status).toEqual({ kind: "idle" });

    store.getState().generate({ tabId: 7, override: null });
    connector.last().emit({ type: "result", result: generationResult() });
    store.getState().regenerate("en");
    connector.last().drop();
    store.getState().dismissError();
    expect(state().status).toEqual({ kind: "result" });
  });

  it("records edits, removals and restores, and starts every new result clean", () => {
    const { connector, store, state } = setup();
    store.getState().generate({ tabId: 7, override: null });
    connector.last().emit({ type: "result", result: generationResult() });

    store.getState().editLine("summary[0]", "Mój własny opis.");
    store.getState().removeLine("skills[0]");
    store.getState().removeLine("skills[0]");
    store.getState().removeLine("skills[1]");
    store.getState().restoreLine("skills[1]");
    expect(state().changes).toEqual({
      edits: { "summary[0]": "Mój własny opis." },
      removed: ["skills[0]"],
    });

    store.getState().regenerate("en");
    connector.last().emit({ type: "result", result: generationResult() });
    expect(state().changes).toEqual({ edits: {}, removed: [] });
  });

  it("ignores events of a run that a newer run replaced", () => {
    const { connector, store, state } = setup();
    store.getState().generate({ tabId: 7, override: null });
    const first = connector.last();
    store.getState().generate({ tabId: 8, override: null });

    first.emit({ type: "error", error: { code: "GENERATION_FAILED", message: "old" } });

    expect(first.state.isDisconnected).toBe(true);
    expect(state().status.kind).toBe("running");
  });

  describe("session copy (panel closed and reopened)", () => {
    function sessionSetup(session = createMemoryStore()) {
      const connector = fakeConnector();
      const store = createGenerateStore({ connect: connector.connect, session });
      return { connector, store, session };
    }

    it("keeps the last result and its edits, and shows them again in a new panel", async () => {
      const first = sessionSetup();
      first.store.getState().generate({ tabId: 7, override: "en" });
      first.connector.last().emit({ type: "result", result: generationResult() });
      first.store.getState().editLine("summary[0]", "Mój opis.");
      first.store.getState().removeLine("skills[1]");
      await flush();

      const reopened = sessionSetup(first.session);
      await reopened.store.getState().restoreSession();

      const state = reopened.store.getState();
      expect(state.status).toEqual({ kind: "result" });
      expect(state.result?.plan).toEqual(generationResult().plan);
      expect(state.changes).toEqual({
        edits: { "summary[0]": "Mój opis." },
        removed: ["skills[1]"],
      });
      // Try again / Regenerate still know the tab and the language.
      expect(state.request).toEqual({ tabId: 7, override: "en" });
    });

    it("keeps the request of the shown result when a later run fails", async () => {
      const first = sessionSetup();
      first.store.getState().generate({ tabId: 7, override: null });
      first.connector.last().emit({ type: "result", result: generationResult() });
      first.store.getState().regenerate("de");
      first.connector.last().drop();
      first.store.getState().removeLine("skills[0]");
      await flush();

      const reopened = sessionSetup(first.session);
      await reopened.store.getState().restoreSession();

      expect(reopened.store.getState().request).toEqual({ tabId: 7, override: null });
    });

    it("doesn't overwrite a run the user started while the copy was being read", async () => {
      const { session } = sessionSetup();
      await session.set(SESSION_KEYS.lastGeneration, {
        version: 1,
        request: { tabId: 7, override: null },
        result: generationResult(),
        changes: { edits: {}, removed: [] },
      });
      const reopened = sessionSetup(session);

      reopened.store.getState().generate({ tabId: 9, override: null });
      await reopened.store.getState().restoreSession();

      expect(reopened.store.getState().status.kind).toBe("running");
      expect(reopened.store.getState().result).toBeNull();
    });

    it("ignores an unreadable copy and starts empty", async () => {
      const session = createMemoryStore({
        [SESSION_KEYS.lastGeneration]: { version: 1, result: { plan: "broken" } },
      });
      const { store } = sessionSetup(session);

      await store.getState().restoreSession();

      expect(store.getState().status).toEqual({ kind: "idle" });
    });

    it("forgets the copy when the result is cleared (profile changed)", async () => {
      const { connector, store, session } = sessionSetup();
      store.getState().generate({ tabId: 7, override: null });
      connector.last().emit({ type: "result", result: generationResult() });
      await flush();
      expect(await session.get(SESSION_KEYS.lastGeneration)).toBeDefined();

      store.getState().clearResult();
      await flush();

      expect(store.getState().status).toEqual({ kind: "idle" });
      expect(await session.get(SESSION_KEYS.lastGeneration)).toBeUndefined();
    });
  });
});
