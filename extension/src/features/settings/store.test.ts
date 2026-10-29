import { describe, expect, it } from "vitest";
import { DEFAULT_GDPR_CLAUSE_SETTINGS } from "@/features/cv-pdf/gdpr-clause";
import { createMemoryStore, STORAGE_KEYS } from "@/lib/storage/local-store";
import { DEFAULT_SETTINGS, MAX_CLAUSE_CHARS, parseSettings } from "./settings";
import { createSettingsStore } from "./store";

describe("parseSettings", () => {
  it("uses Sonnet 5.5 and the default clause when nothing is stored", () => {
    expect(parseSettings({ model: undefined, gdprClause: undefined })).toEqual(DEFAULT_SETTINGS);
    expect(DEFAULT_SETTINGS.model).toBe("claude-sonnet-5-5");
  });

  it("falls back per field: an unknown model doesn't reset a valid clause", () => {
    const clause = { mode: "always", textPl: "Zgoda.", textEn: "Consent." } as const;

    expect(parseSettings({ model: "claude-retired-1", gdprClause: clause })).toEqual({
      model: DEFAULT_SETTINGS.model,
      gdprClause: clause,
    });
    expect(parseSettings({ model: "claude-opus-5-5", gdprClause: { mode: "sometimes" } })).toEqual({
      model: "claude-opus-5-5",
      gdprClause: DEFAULT_GDPR_CLAUSE_SETTINGS,
    });
  });
});

describe("settings store", () => {
  it("loads stored settings and writes every change at once", async () => {
    const memory = createMemoryStore({ [STORAGE_KEYS.model]: "claude-haiku-5-5" });
    const store = createSettingsStore(memory);
    expect(store.getState().status).toBe("loading");

    await store.getState().load();
    expect(store.getState()).toMatchObject({ status: "ready", model: "claude-haiku-5-5" });

    store.getState().setModel("claude-opus-5-5");
    store.getState().setGdprClause({ mode: "never", textPl: "", textEn: "" });
    await Promise.resolve();

    expect(memory.data.get(STORAGE_KEYS.model)).toBe("claude-opus-5-5");
    expect(memory.data.get(STORAGE_KEYS.gdprClause)).toEqual({
      mode: "never",
      textPl: "",
      textEn: "",
    });
    const reopened = createSettingsStore(memory);
    await reopened.getState().load();
    expect(reopened.getState().model).toBe("claude-opus-5-5");
  });

  it("refuses a clause longer than the limit", async () => {
    const store = createSettingsStore(createMemoryStore());
    await store.getState().load();

    store.getState().setGdprClause({
      mode: "always",
      textPl: "x".repeat(MAX_CLAUSE_CHARS + 1),
      textEn: "",
    });

    expect(store.getState().gdprClause).toEqual(DEFAULT_GDPR_CLAUSE_SETTINGS);
  });

  it("keeps working with defaults when storage can't be read", async () => {
    const broken = {
      get: () => Promise.reject(new Error("storage unavailable")),
      set: () => Promise.reject(new Error("storage unavailable")),
      remove: () => Promise.resolve(),
    };
    const store = createSettingsStore(broken);

    await store.getState().load();
    store.getState().setModel("claude-opus-5-5");

    expect(store.getState()).toMatchObject({ status: "ready", model: "claude-opus-5-5" });
  });
});
