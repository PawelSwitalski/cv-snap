import { describe, expect, it } from "vitest";
import { loadFixture } from "../test/fixtures.js";
import { unresolvedCitations } from "./citations.js";
import { CvProfileSchema } from "./cv-profile.js";
import { TailoringPlanSchema } from "./tailoring-plan.js";

const profile = () => CvProfileSchema.parse(loadFixture("profile"));
const plan = () => TailoringPlanSchema.parse(loadFixture("plan"));

describe("unresolvedCitations", () => {
  it("returns nothing when every citation resolves", () => {
    expect(unresolvedCitations(plan(), profile())).toEqual([]);
  });

  it("reports unknown IDs in summary, item, bullet and skill citations with their paths", () => {
    const broken = plan();
    const summary = broken.summary[0];
    const item = broken.items[0];
    const bullet = item?.bullets[0];
    const skill = broken.skills[1];
    if (!summary || !item || !bullet || !skill) throw new Error("fixture changed");
    summary.sourceIds = ["sum_1", "sum_ghost"];
    item.profileId = "exp_ghost";
    bullet.sourceIds = ["exp_acme_b9"];
    skill.sourceIds = ["skl_ghost"];

    expect(unresolvedCitations(broken, profile())).toEqual([
      { path: "summary[0]", id: "sum_ghost" },
      { path: "items[0].profileId", id: "exp_ghost" },
      { path: "items[0].bullets[0]", id: "exp_acme_b9" },
      { path: "skills[1]", id: "skl_ghost" },
    ]);
  });

  it("reports paths and IDs only, never line text", () => {
    const broken = plan();
    const line = broken.summary[0];
    if (!line) throw new Error("fixture changed");
    line.text = "Jan Testowy secret";
    line.sourceIds = ["nope"];

    expect(JSON.stringify(unresolvedCitations(broken, profile()))).not.toContain("Testowy");
  });
});
