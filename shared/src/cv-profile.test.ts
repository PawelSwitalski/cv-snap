import { describe, expect, it } from "vitest";
import { loadFixture } from "../test/fixtures.js";
import {
  collectProfileIds,
  CvProfileContentSchema,
  CvProfileSchema,
  ParsedCvProfileContentSchema,
  type CvProfile,
} from "./cv-profile.js";
import { parseWithReadableError } from "./parse.js";

function validProfile(): CvProfile {
  return CvProfileSchema.parse(loadFixture("profile"));
}

describe("CvProfileSchema", () => {
  it("parses the valid fixture", () => {
    const result = parseWithReadableError(CvProfileSchema, loadFixture("profile"));

    expect(result.ok).toBe(true);
  });

  it("rejects a profile with a wrong schemaVersion", () => {
    const input = { ...loadFixture("profile"), schemaVersion: 2 };

    const result = parseWithReadableError(CvProfileSchema, input);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toContain("schemaVersion");
  });

  it("rejects a profile with a missing required field, naming the path", () => {
    const input = loadFixture("profile");
    delete input.contact;

    const result = parseWithReadableError(CvProfileSchema, input);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toContain("contact");
  });

  it("rejects an invalid month with a readable message", () => {
    const profile = validProfile();
    const first = profile.experience[0];
    if (!first?.startDate) throw new Error("fixture changed");
    first.startDate.month = 13;

    const result = parseWithReadableError(CvProfileSchema, profile);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toContain("experience[0].startDate.month");
  });

  it("rejects a source language that is not ISO 639-1", () => {
    const input = { ...loadFixture("profile"), sourceLanguage: "polish" };

    const result = parseWithReadableError(CvProfileSchema, input);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toContain("ISO 639-1");
  });

  it("rejects duplicate ids across sections and lists them", () => {
    const profile = validProfile();
    const skill = profile.skills[0];
    if (!skill) throw new Error("fixture changed");
    skill.id = "exp_acme_b1";

    const result = parseWithReadableError(CvProfileSchema, profile);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toContain("duplicate ids: exp_acme_b1");
  });

  it("rejects ids with characters outside the allowed set", () => {
    const profile = validProfile();
    const bullet = profile.summary[0];
    if (!bullet) throw new Error("fixture changed");
    bullet.id = "has space";

    expect(CvProfileSchema.safeParse(profile).success).toBe(false);
  });

  it("keeps every id unchanged when only text is edited", () => {
    const before = validProfile();
    const edited = structuredClone(before);
    const bullet = edited.experience[0]?.bullets[0];
    if (!bullet) throw new Error("fixture changed");
    bullet.text = "Zmieniony tekst";

    const reparsed = CvProfileSchema.parse(edited);

    expect(collectProfileIds(reparsed)).toEqual(collectProfileIds(before));
  });
});

describe("ParsedCvProfileContentSchema", () => {
  it("accepts content without persistence fields and still rejects duplicate ids", () => {
    const content = CvProfileContentSchema.parse(loadFixture("profile"));
    const duplicate = structuredClone(content);
    const edu = duplicate.education[0];
    if (!edu) throw new Error("fixture changed");
    edu.id = "exp_beta";

    expect(ParsedCvProfileContentSchema.safeParse(content).success).toBe(true);
    expect(ParsedCvProfileContentSchema.safeParse(duplicate).success).toBe(false);
  });

  it("strips persistence-only fields when parsing content", () => {
    const content = CvProfileContentSchema.parse(loadFixture("profile"));

    expect(content).not.toHaveProperty("schemaVersion");
  });
});

describe("collectProfileIds", () => {
  it("returns every item and bullet id from every section", () => {
    const ids = collectProfileIds(validProfile());

    expect(ids).toEqual([
      "sum_1",
      "exp_acme",
      "exp_acme_b1",
      "exp_acme_b2",
      "exp_beta",
      "exp_beta_b1",
      "prj_cvsnap",
      "prj_cvsnap_b1",
      "edu_agh",
      "skl_react",
      "skl_ts",
      "lng_en",
      "crt_aws",
      "oth_hobby",
      "oth_hobby_1",
    ]);
  });
});
