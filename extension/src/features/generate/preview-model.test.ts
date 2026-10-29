import { validatePlan, type TailoringPlan } from "@cv-snap/shared";
import { describe, expect, it } from "vitest";
import { smallPlan, smallProfile } from "../../../test/cv-fixtures";
import { fabricatedPlan } from "../../../test/generate-fixtures";
import {
  buildPreviewModel,
  isAllUnverified,
  NO_CHANGES,
  printedLineIds,
  type PreviewChanges,
} from "./preview-model";

const FABRICATED = "items[exp_acme].bullets[0]";

function bulletsOf(plan: TailoringPlan, changes: PreviewChanges = NO_CHANGES) {
  const preview = buildPreviewModel(plan, smallProfile(), changes);
  const entry = preview.model.sections
    .flatMap((section) => section.entries)
    .find((candidate) => candidate.id === "exp_acme");
  return { preview, bullets: entry?.bullets ?? [] };
}

describe("buildPreviewModel", () => {
  it("marks a line with facts missing from the profile as unverified", () => {
    const { preview } = bulletsOf(fabricatedPlan());

    expect(preview.annotations.get(FABRICATED)).toEqual({
      lineId: FABRICATED,
      status: "unverified",
      isUserEdited: false,
    });
    expect(preview.annotations.get("skills[0]")?.status).toBe("verified");
  });

  it("prints an edited line in the user's words, marked and excluded from validation", () => {
    const { preview, bullets } = bulletsOf(fabricatedPlan(), {
      edits: { [FABRICATED]: "Migracja 12 aplikacji do TypeScript (moje słowa)." },
      removed: [],
    });

    expect(bullets).toEqual(["Migracja 12 aplikacji do TypeScript (moje słowa)."]);
    expect(preview.annotations.get(FABRICATED)).toMatchObject({
      status: "skipped",
      isUserEdited: true,
    });
    expect(preview.validation.summary.unverified).toBe(0);
  });

  it("leaves removed lines out of the CV and of the verdicts", () => {
    const { preview, bullets } = bulletsOf(fabricatedPlan(), { edits: {}, removed: [FABRICATED] });

    expect(bullets).toEqual([]);
    expect(preview.annotations.has(FABRICATED)).toBe(false);
    expect(preview.validation.summary.unverified).toBe(0);
  });

  it("keeps printed lines tied to their original IDs after a removal shifts positions", () => {
    const plan = smallPlan();
    plan.skills.push({ name: "Vitest", sourceIds: ["skl_ts"] });

    const ids = printedLineIds(plan, ["skills[0]"]);
    const { preview } = bulletsOf(plan, { edits: {}, removed: ["skills[0]"] });
    const skills = preview.model.sections.find((section) => section.key === "skills");

    expect(skills?.entries[0]?.bullets).toEqual(["TypeScript", "Vitest"]);
    expect(ids.skills).toEqual(["skills[1]", "skills[2]"]);
  });

  it("maps a repeated item to the copy the CV prints (the best-ranked one)", () => {
    const plan = smallPlan();
    plan.items.push({
      profileId: "exp_acme",
      rank: 1,
      bullets: [{ text: "Druga kopia.", sourceIds: ["exp_acme_b1"] }],
    });
    const first = plan.items[0];
    if (first) first.rank = 3;

    const ids = printedLineIds(plan, []);

    expect(ids.items.get("exp_acme")).toEqual(["items[exp_acme~2].bullets[0]"]);
  });

  it("is deterministic: the same inputs give the same model", () => {
    const changes = { edits: { "summary[0]": "Opis." }, removed: ["skills[1]"] };

    expect(buildPreviewModel(smallPlan(), smallProfile(), changes).model).toEqual(
      buildPreviewModel(smallPlan(), smallProfile(), changes).model,
    );
  });
});

describe("isAllUnverified", () => {
  it("is true only when every remaining line is unverified", () => {
    const plan = fabricatedPlan();
    plan.summary = [];
    plan.skills = [];
    expect(isAllUnverified(validatePlan(plan, smallProfile()))).toBe(true);

    expect(isAllUnverified(validatePlan(fabricatedPlan(), smallProfile()))).toBe(false);
    expect(isAllUnverified(validatePlan(smallPlan(), smallProfile()))).toBe(false);
  });
});
