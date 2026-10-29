import { describe, expect, it } from "vitest";
import { catalogShape, formatMessage, resolveLanguage } from "./messages";

describe("message catalogs", () => {
  it("have the same keys and placeholders in English and Polish", () => {
    expect(catalogShape("pl")).toEqual(catalogShape("en"));
  });

  it("use only key and placeholder names Chrome accepts (ASCII letters, digits, _)", () => {
    // Chrome refuses to load the extension otherwise ("Name of a key … is invalid").
    for (const language of ["en", "pl"] as const) {
      for (const [key, placeholders] of catalogShape(language)) {
        expect(key, `${language}: ${key}`).toMatch(/^[A-Za-z0-9_]+$/);
        for (const name of placeholders) expect(name).toMatch(/^[A-Za-z0-9_]+$/);
      }
    }
  });

  it("substitute named placeholders", () => {
    expect(formatMessage("en", "editor_move_up", ["Acme"])).toBe("Move Acme up");
    expect(formatMessage("pl", "home_profile_ready", ["Jan Testowy"])).toBe(
      "Aktywny profil: Jan Testowy",
    );
  });
});

describe("resolveLanguage", () => {
  it.each([
    ["auto", "pl-PL", "pl"],
    ["auto", "pl", "pl"],
    ["auto", "en-GB", "en"],
    ["auto", "de-DE", "en"],
    ["auto", undefined, "en"],
    ["pl", "en-US", "pl"],
    ["en", "pl-PL", "en"],
  ] as const)("override %s with browser %s → %s", (override, browser, expected) => {
    expect(resolveLanguage(override, browser)).toBe(expected);
  });
});
