import { describe, expect, it } from "vitest";
import { foldForSearch, stripDiacritics } from "./fold-text";

describe("fold-text", () => {
  it("removes Polish and other diacritics, including letters NFKD can't split", () => {
    expect(stripDiacritics("Łódź Żółć gęślą jaźń")).toBe("Lodz Zolc gesla jazn");
    expect(stripDiacritics("Straße Øre Æsir")).toBe("Strasse Ore AEsir");
  });

  it("folds case and surrounding space for matching", () => {
    expect(foldForSearch("  ŁÓDŹ ")).toBe("lodz");
    expect(foldForSearch("Łódź")).toBe(foldForSearch("LODZ"));
  });
});
