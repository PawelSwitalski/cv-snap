import { describe, expect, it } from "vitest";
import { decideOutputLanguage, languageName } from "./output-language.js";

describe("decideOutputLanguage", () => {
  it("uses the user's override first", () => {
    expect(decideOutputLanguage({ language: "pl" }, "de", "en")).toEqual({
      code: "de",
      source: "override",
    });
  });

  it("otherwise follows the ad's language, whatever it is", () => {
    expect(decideOutputLanguage({ language: "pl" }, null, "en")).toEqual({
      code: "pl",
      source: "ad",
    });
    expect(decideOutputLanguage({ language: "fr" }, null, "pl")).toEqual({
      code: "fr",
      source: "ad",
    });
  });

  it("falls back to the profile's language when the ad's is undecidable", () => {
    expect(decideOutputLanguage({ language: null }, null, "pl")).toEqual({
      code: "pl",
      source: "profile",
    });
  });
});

describe("languageName", () => {
  it("names languages in English for prompts", () => {
    expect(languageName("de")).toBe("German");
    expect(languageName("pl")).toBe("Polish");
  });

  it("falls back to the code for codes the runtime doesn't know", () => {
    expect(languageName("zz")).toBe("zz");
  });
});
