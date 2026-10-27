import { describe, expect, it } from "vitest";
import {
  DEFAULT_GDPR_CLAUSE_EN,
  DEFAULT_GDPR_CLAUSE_PL,
  DEFAULT_GDPR_CLAUSE_SETTINGS,
  selectClause,
  shouldIncludeClause,
} from "./gdpr-clause";

describe("shouldIncludeClause", () => {
  it("defaults to Polish ads only", () => {
    expect(DEFAULT_GDPR_CLAUSE_SETTINGS.mode).toBe("polishAdsOnly");
    expect(shouldIncludeClause("polishAdsOnly", "pl", "en")).toBe(true);
    expect(shouldIncludeClause("polishAdsOnly", "en", "pl")).toBe(false);
    expect(shouldIncludeClause("polishAdsOnly", "de", "de")).toBe(false);
  });

  it("uses the decided output language when the ad's language is undecidable", () => {
    expect(shouldIncludeClause("polishAdsOnly", null, "pl")).toBe(true);
    expect(shouldIncludeClause("polishAdsOnly", null, "en")).toBe(false);
  });

  it("honours always and never regardless of the ad language", () => {
    expect(shouldIncludeClause("always", "en", "en")).toBe(true);
    expect(shouldIncludeClause("never", "pl", "pl")).toBe(false);
  });
});

describe("selectClause", () => {
  it("adds the Polish clause to a CV for a Polish ad and nothing for an English ad (default)", () => {
    expect(selectClause(DEFAULT_GDPR_CLAUSE_SETTINGS, "pl", "pl")).toBe(DEFAULT_GDPR_CLAUSE_PL);
    expect(selectClause(DEFAULT_GDPR_CLAUSE_SETTINGS, "en", "en")).toBeNull();
  });

  it("follows the CV's output language for the text (override to English → English clause)", () => {
    expect(selectClause(DEFAULT_GDPR_CLAUSE_SETTINGS, "pl", "en")).toBe(DEFAULT_GDPR_CLAUSE_EN);
  });

  it("returns the settings text verbatim, unchanged", () => {
    const textPl = "  Moja własna klauzula — dla [Firma] (zgoda RODO).\n";
    const settings = { ...DEFAULT_GDPR_CLAUSE_SETTINGS, mode: "always" as const, textPl };

    expect(selectClause(settings, "en", "pl")).toBe(textPl);
  });

  it("prints nothing when the settings text is blank", () => {
    const settings = { ...DEFAULT_GDPR_CLAUSE_SETTINGS, textPl: "   " };

    expect(selectClause(settings, "pl", "pl")).toBeNull();
  });

  it("ships standard default texts that name a placeholder company", () => {
    expect(DEFAULT_GDPR_CLAUSE_PL).toMatch(
      /^Wyrażam zgodę na przetwarzanie moich danych osobowych/,
    );
    expect(DEFAULT_GDPR_CLAUSE_PL).toContain("[nazwa firmy]");
    expect(DEFAULT_GDPR_CLAUSE_EN).toContain("[company name]");
  });
});
