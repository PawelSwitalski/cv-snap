import { describe, expect, it } from "vitest";
import { extractionFixture } from "../test/extraction.js";
import { loadFixture } from "../test/fixtures.js";
import { CvProfileExtractionSchema } from "./cv-profile.js";
import { JobRequirementsSchema } from "./job-requirements.js";
import { toClaudeJsonSchema } from "./json-schema.js";
import { LIMITS } from "./limits.js";
import { MAX_OUTBOUND_MESSAGE_BYTES } from "./protocol.js";
import { TailoringPlanSchema } from "./tailoring-plan.js";

describe("size caps on AI output", () => {
  it("rejects a bullet longer than the line cap", () => {
    const extraction = extractionFixture();
    const job = extraction.experience[0];
    if (!job) throw new Error("fixture changed");
    job.bullets = ["x".repeat(LIMITS.lineChars + 1)];

    expect(CvProfileExtractionSchema.safeParse(extraction).success).toBe(false);
  });

  it("rejects too many requirements and too many plan items", () => {
    const requirements = {
      ...loadFixture("requirements"),
      mustHaves: Array.from({ length: LIMITS.listItems + 1 }, () => "Java"),
    };
    const plan = loadFixture("plan");
    const item = (plan.items as unknown[])[0];
    plan.items = Array.from({ length: LIMITS.sectionItems + 1 }, () => item);

    expect(JobRequirementsSchema.safeParse(requirements).success).toBe(false);
    expect(TailoringPlanSchema.safeParse(plan).success).toBe(false);
  });

  it("passes the caps to Claude through the JSON Schema", () => {
    const schema = toClaudeJsonSchema("requirements") as {
      properties: { mustHaves: { maxItems: number; items: { maxLength: number } } };
    };

    expect(schema.properties.mustHaves.maxItems).toBe(LIMITS.listItems);
    expect(schema.properties.mustHaves.items.maxLength).toBe(LIMITS.lineChars);
  });

  it("keeps a maximal requirements reply under the 1 MB native-messaging limit", () => {
    const line = "x".repeat(LIMITS.lineChars);
    const short = "y".repeat(LIMITS.shortChars);
    const maximal = {
      title: short,
      company: short,
      location: short,
      seniority: "senior",
      mustHaves: Array.from({ length: LIMITS.listItems }, () => line),
      niceToHaves: Array.from({ length: LIMITS.listItems }, () => line),
      keywords: Array.from({ length: LIMITS.listItems }, () => short),
      language: "pl",
    };

    expect(JobRequirementsSchema.safeParse(maximal).success).toBe(true);
    expect(Buffer.byteLength(JSON.stringify(maximal))).toBeLessThan(MAX_OUTBOUND_MESSAGE_BYTES);
  });
});
