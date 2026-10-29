import { describe, expect, it } from "vitest";
import { languageKey } from "../lexicon/generic-words.js";
import { baseFormCandidates } from "./text.js";

describe("baseFormCandidates", () => {
  it.each([
    ["javie", "java"],
    ["angularze", "angular"],
    ["scrumie", "scrum"],
    ["pythonie", "python"],
    ["firmie", "firma"],
  ])("finds the base form of %j", (word, base) => {
    expect(baseFormCandidates(word)).toContain(base);
  });

  it("keeps the word itself and never produces stems shorter than 3 letters", () => {
    expect(baseFormCandidates("go")).toEqual(["go"]);
    expect(baseFormCandidates("rue")).toEqual(["rue"]);
  });
});

describe("languageKey", () => {
  it("maps PL/EN/DE names of one language to the same key", () => {
    expect(languageKey("angielski")).toBe(languageKey("english"));
    expect(languageKey("englisch")).toBe(languageKey("english"));
    expect(languageKey("niemiecki")).not.toBe(languageKey("english"));
  });

  it("returns null for words that aren't language names", () => {
    expect(languageKey("typescript")).toBeNull();
  });
});
