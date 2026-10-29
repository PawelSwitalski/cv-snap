import { describe, expect, it } from "vitest";
import { extractionFixture } from "../test/extraction.js";
import {
  collectProfileIds,
  CvProfileContentSchema,
  CvProfileExtractionSchema,
  ParsedCvProfileContentSchema,
} from "./cv-profile.js";
import { findDuplicateIds } from "./ids.js";
import { assignProfileIds, placeholderToNull, PROFILE_ID_PREFIXES } from "./profile-ids.js";

describe("assignProfileIds", () => {
  it("produces content that passes the profile schema, keeping the source language", () => {
    const profile = assignProfileIds(extractionFixture());

    expect(ParsedCvProfileContentSchema.safeParse(profile).success).toBe(true);
    expect(profile.sourceLanguage).toBe("pl");
  });

  it("gives every item and bullet a unique ID", () => {
    const ids = collectProfileIds(assignProfileIds(extractionFixture()));

    expect(ids).toHaveLength(16);
    expect(findDuplicateIds(ids)).toEqual([]);
  });

  it("prefixes item IDs by kind and derives bullet IDs from their item", () => {
    const profile = assignProfileIds(extractionFixture());
    const job = profile.experience[0];
    const section = profile.otherSections[0];

    expect(profile.summary[0]?.id).toMatch(/^sum_/);
    expect(job?.id).toMatch(/^exp_/);
    expect(job?.bullets.map((bullet) => bullet.id)).toEqual([
      `${job?.id ?? ""}_b1`,
      `${job?.id ?? ""}_b2`,
    ]);
    expect(profile.projects[0]?.id).toMatch(/^prj_/);
    expect(profile.education[0]?.id).toMatch(/^edu_/);
    expect(profile.skills[0]?.id).toMatch(/^skl_/);
    expect(profile.languages[0]?.id).toMatch(/^lng_/);
    expect(profile.certifications[0]?.id).toMatch(/^crt_/);
    expect(section?.items[0]?.id).toBe(`${section?.id ?? ""}_b1`);
    expect(Object.keys(PROFILE_ID_PREFIXES)).toHaveLength(8);
  });

  it("keeps every fact and its order unchanged", () => {
    const extraction = extractionFixture();

    const profile = assignProfileIds(extraction);

    expect(profile.experience.map((item) => item.bullets.map((bullet) => bullet.text))).toEqual(
      extraction.experience.map((item) => item.bullets),
    );
    expect(profile.contact).toEqual(extraction.contact);
    expect(profile.experience[1]?.startDate).toEqual({ year: 2019, month: null });
  });

  it("ignores IDs the model sneaks in: the extraction schema strips them", () => {
    const withModelIds = {
      ...extractionFixture(),
      experience: extractionFixture().experience.map((item) => ({ ...item, id: "exp_model" })),
    };

    const parsed = CvProfileExtractionSchema.parse(withModelIds);
    const profile = assignProfileIds(parsed);

    expect(profile.experience.map((item) => item.id)).not.toContain("exp_model");
    expect(findDuplicateIds(collectProfileIds(profile))).toEqual([]);
  });

  it("assigns fresh opaque IDs on every run (not derived from content)", () => {
    const first = collectProfileIds(assignProfileIds(extractionFixture()));
    const second = collectProfileIds(assignProfileIds(extractionFixture()));

    expect(first).not.toEqual(second);
  });

  it("turns placeholder values for unstated facts into null instead of keeping them as text", () => {
    const extraction = extractionFixture();
    const job = extraction.experience[0];
    if (!job) throw new Error("fixture changed");
    job.company = "unknown";
    job.location = "Brak";

    const content = assignProfileIds(extraction);

    expect(content.experience[0]).toMatchObject({ company: null, location: null });
    expect(CvProfileContentSchema.safeParse(content).success).toBe(true);
  });
});

describe("placeholderToNull", () => {
  it.each(["unknown", "  N/A ", "-", "—", "brak", "nie podano", "Unbekannt", ""])(
    "maps %j to null",
    (value) => {
      expect(placeholderToNull(value)).toBeNull();
    },
  );

  it("keeps real values (trimmed) and null", () => {
    expect(placeholderToNull("  Acme Sp. z o.o. ")).toBe("Acme Sp. z o.o.");
    expect(placeholderToNull("Unknown Worlds Entertainment")).toBe("Unknown Worlds Entertainment");
    expect(placeholderToNull(null)).toBeNull();
  });
});
