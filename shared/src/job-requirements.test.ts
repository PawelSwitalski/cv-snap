import { describe, expect, it } from "vitest";
import { loadFixture } from "../test/fixtures.js";
import { JobRequirementsSchema } from "./job-requirements.js";
import { parseWithReadableError } from "./parse.js";

describe("JobRequirementsSchema", () => {
  it("parses the valid fixture, including a null company", () => {
    const result = JobRequirementsSchema.parse(loadFixture("requirements"));

    expect(result.company).toBeNull();
  });

  it("accepts 'unknown' seniority instead of forcing a guess", () => {
    const input = { ...loadFixture("requirements"), seniority: "unknown" };

    expect(JobRequirementsSchema.safeParse(input).success).toBe(true);
  });

  it("accepts any ISO 639-1 language, not just pl/en", () => {
    const input = { ...loadFixture("requirements"), language: "de" };

    expect(JobRequirementsSchema.safeParse(input).success).toBe(true);
  });

  it("rejects an unknown seniority with a readable message", () => {
    const input = { ...loadFixture("requirements"), seniority: "rockstar" };

    const result = parseWithReadableError(JobRequirementsSchema, input);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toContain("seniority");
  });

  it("rejects empty strings in requirement lists", () => {
    const input = { ...loadFixture("requirements"), mustHaves: ["React", ""] };

    expect(JobRequirementsSchema.safeParse(input).success).toBe(false);
  });
});
