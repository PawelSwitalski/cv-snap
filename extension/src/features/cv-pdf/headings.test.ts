import type { PlanHeadings } from "@cv-snap/shared";
import { describe, expect, it } from "vitest";
import { BUILT_IN_HEADINGS, presentLabel, resolveHeadings } from "./headings";

const noHeadings: PlanHeadings = {
  summary: null,
  experience: null,
  projects: null,
  education: null,
  skills: null,
  languages: null,
  certifications: null,
};

describe("resolveHeadings", () => {
  it("uses the built-in Polish and English headings, ignoring plan headings", () => {
    const planHeadings = { ...noHeadings, experience: "Something else" };

    expect(resolveHeadings("pl", planHeadings)).toEqual(BUILT_IN_HEADINGS.pl);
    expect(resolveHeadings("en", planHeadings)).toEqual(BUILT_IN_HEADINGS.en);
  });

  it("uses the plan's headings for other languages", () => {
    const planHeadings = { ...noHeadings, experience: "Berufserfahrung", skills: "Kenntnisse" };

    const headings = resolveHeadings("de", planHeadings);

    expect(headings.experience).toBe("Berufserfahrung");
    expect(headings.skills).toBe("Kenntnisse");
  });

  it("falls back to English for each heading the plan leaves out or blank", () => {
    const headings = resolveHeadings("de", { ...noHeadings, summary: "   " });

    expect(headings).toEqual(BUILT_IN_HEADINGS.en);
  });
});

describe("presentLabel", () => {
  it("knows PL and EN, and returns null for other languages", () => {
    expect(presentLabel("pl")).toBe("obecnie");
    expect(presentLabel("en")).toBe("present");
    expect(presentLabel("fr")).toBeNull();
  });
});
