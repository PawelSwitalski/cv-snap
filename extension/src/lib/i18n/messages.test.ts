import { describe, expect, it } from "vitest";
import { catalogShape, formatMessage, resolveLanguage } from "./messages";

describe("message catalogs", () => {
  it("have the same keys and placeholders in English and Polish", () => {
    expect(catalogShape("pl")).toEqual(catalogShape("en"));
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
