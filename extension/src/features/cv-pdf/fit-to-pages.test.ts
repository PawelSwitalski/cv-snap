import { describe, expect, it } from "vitest";
import { buildLongCv } from "../../../test/cv-fixtures";
import { buildCvModel, type CvModel } from "./cv-model";
import { applyDropSteps, fitToTwoPages, planDropSteps } from "./fit-to-pages";

/** Fake page measure: one page per `perPage` bullets + items, counting the calls. */
function fakeMeasure(perPage: number) {
  let calls = 0;
  const measure = (model: CvModel) => {
    calls++;
    const units = model.sections
      .filter((section) => section.layout === "entries")
      .flatMap((section) => section.entries)
      .reduce((sum, entry) => sum + 1 + entry.bullets.length, 0);
    return Promise.resolve(Math.max(1, Math.ceil(units / perPage)));
  };
  return { measure, calls: () => calls };
}

const longModel = (items = 4, bullets = 3) => {
  const { profile, plan } = buildLongCv(items, bullets);
  return buildCvModel(profile, plan, { clause: "Klauzula" });
};

describe("planDropSteps", () => {
  it("drops bullets (from the end) before the item, lowest rank first", () => {
    const steps = planDropSteps(longModel(2, 2));

    expect(steps).toEqual([
      { kind: "bullet", entryId: "exp_2", bulletIndex: 1 },
      { kind: "bullet", entryId: "exp_2", bulletIndex: 0 },
      { kind: "item", entryId: "exp_2" },
      { kind: "bullet", entryId: "exp_1", bulletIndex: 1 },
      { kind: "bullet", entryId: "exp_1", bulletIndex: 0 },
      { kind: "item", entryId: "exp_1" },
    ]);
  });

  it("never schedules the summary, skills, languages, certifications or header", () => {
    const ids = new Set(planDropSteps(longModel()).map((step) => step.entryId));

    expect([...ids].every((id) => id.startsWith("exp_"))).toBe(true);
  });
});

describe("applyDropSteps", () => {
  it("removes content without mutating the input and reports what was dropped", () => {
    const model = longModel(2, 2);
    const before = structuredClone(model);

    const { model: smaller, dropped } = applyDropSteps(model, planDropSteps(model), 3);

    expect(model).toEqual(before);
    expect(dropped.map((d) => [d.kind, d.entryId])).toEqual([["item", "exp_2"]]);
    expect(smaller.sections.find((s) => s.key === "experience")?.entries.map((e) => e.id)).toEqual([
      "exp_1",
    ]);
    expect(smaller.clause).toBe("Klauzula");
  });

  it("reports dropped bullets with their text", () => {
    const model = longModel(2, 2);

    const { dropped } = applyDropSteps(model, planDropSteps(model), 1);

    expect(dropped).toHaveLength(1);
    expect(dropped[0]).toMatchObject({ kind: "bullet", entryId: "exp_2" });
    expect(dropped[0]?.text).toMatch(/^Zadanie 2 w firmie 2/);
  });

  it("removes a section whose entries were all dropped", () => {
    const model = longModel(1, 0);

    const { model: smaller } = applyDropSteps(model, planDropSteps(model), 1);

    expect(smaller.sections.some((s) => s.key === "experience")).toBe(false);
    expect(smaller.sections.some((s) => s.key === "summary")).toBe(true);
  });
});

describe("fitToTwoPages", () => {
  it("leaves a CV that already fits untouched, with a single measurement", async () => {
    const fake = fakeMeasure(100);
    const model = longModel();

    const result = await fitToTwoPages(model, fake.measure);

    expect(result).toEqual({ model, dropped: [], pageCount: 1, fits: true });
    expect(fake.calls()).toBe(1);
  });

  it("drops the fewest steps that reach two pages, lowest rank first", async () => {
    // 4 items × (1 + 3 bullets) = 16 units; 7 per page → 3 pages; 14 units (2 pages) needs 2 drops.
    const fake = fakeMeasure(7);

    const result = await fitToTwoPages(longModel(4, 3), fake.measure);

    expect(result.fits).toBe(true);
    expect(result.pageCount).toBe(2);
    expect(result.dropped.map((d) => [d.kind, d.entryId])).toEqual([
      ["bullet", "exp_4"],
      ["bullet", "exp_4"],
    ]);
  });

  it("uses a binary search: far fewer renders than drop steps", async () => {
    const fake = fakeMeasure(10);

    await fitToTwoPages(longModel(12, 6), fake.measure);

    expect(fake.calls()).toBeLessThanOrEqual(2 + Math.ceil(Math.log2(12 * 7)) + 1);
  });

  it("is deterministic", async () => {
    const first = await fitToTwoPages(longModel(6, 4), fakeMeasure(9).measure);
    const second = await fitToTwoPages(longModel(6, 4), fakeMeasure(9).measure);

    expect(first).toEqual(second);
  });

  it("reports fits: false when even dropping every ranked item is not enough", async () => {
    const measure = () => Promise.resolve(3);

    const result = await fitToTwoPages(longModel(2, 1), measure);

    expect(result.fits).toBe(false);
    expect(result.model.sections.some((s) => s.key === "experience")).toBe(false);
    expect(result.model.header.fullName).toBe("Jan Testowy");
    expect(result.model.clause).toBe("Klauzula");
  });
});

/** A long CV whose profile has an unplanned school (two bullets) and two skills outside the plan. */
function longModelWithEducation(items = 2, bullets = 1) {
  const { profile, plan } = buildLongCv(items, bullets);
  profile.education = [
    {
      id: "edu_1",
      institution: "Uczelnia Testowa",
      degree: "inż.",
      field: null,
      startDate: { year: 2010, month: 10 },
      endDate: { year: 2014, month: 2 },
      isCurrent: false,
      bullets: [
        { id: "edu_1_b1", text: "Projekt dyplomowy." },
        { id: "edu_1_b2", text: "Koło naukowe." },
      ],
    },
  ];
  profile.skills = [
    { id: "skl_ts", name: "TypeScript", category: null },
    { id: "skl_docker", name: "Docker", category: null },
    { id: "skl_go", name: "Go", category: null },
  ];
  plan.skills = [{ name: "TypeScript", sourceIds: ["skl_ts"] }];
  return buildCvModel(profile, plan, { clause: "Klauzula" });
}

describe("two-page fit: education and skills (intent 003)", () => {
  it("drops unplanned education bullets first, never the entry, and profile skills last", () => {
    const steps = planDropSteps(longModelWithEducation(2, 1));

    expect(steps).toEqual([
      { kind: "bullet", entryId: "edu_1", bulletIndex: 1 },
      { kind: "bullet", entryId: "edu_1", bulletIndex: 0 },
      { kind: "bullet", entryId: "exp_2", bulletIndex: 0 },
      { kind: "item", entryId: "exp_2" },
      { kind: "bullet", entryId: "exp_1", bulletIndex: 0 },
      { kind: "item", entryId: "exp_1" },
      { kind: "skill", entryId: "skills", bulletIndex: 2 },
      { kind: "skill", entryId: "skills", bulletIndex: 1 },
    ]);
  });

  it("keeps a planned education entry, dropping only its bullets", () => {
    const { profile, plan } = buildLongCv(1, 0);
    profile.education = [
      {
        id: "edu_1",
        institution: "Uczelnia Testowa",
        degree: null,
        field: null,
        startDate: null,
        endDate: null,
        isCurrent: false,
        bullets: [{ id: "edu_1_b1", text: "Projekt dyplomowy." }],
      },
    ];
    plan.items.push({
      profileId: "edu_1",
      rank: 2,
      bullets: [{ text: "Projekt dyplomowy.", sourceIds: ["edu_1_b1"] }],
    });

    const steps = planDropSteps(buildCvModel(profile, plan));

    expect(steps.filter((step) => step.entryId === "edu_1")).toEqual([
      { kind: "bullet", entryId: "edu_1", bulletIndex: 0 },
    ]);
  });

  it("reports dropped skills by name and keeps the plan's skills", () => {
    const model = longModelWithEducation(1, 0);
    const steps = planDropSteps(model);

    const { model: smaller, dropped } = applyDropSteps(model, steps, steps.length);

    expect(dropped.filter((item) => item.kind === "skill")).toEqual([
      { kind: "skill", entryId: "skills", title: null, text: "Docker" },
      { kind: "skill", entryId: "skills", title: null, text: "Go" },
    ]);
    expect(smaller.sections.find((s) => s.key === "skills")?.entries[0]?.bullets).toEqual([
      "TypeScript",
    ]);
    expect(smaller.sections.find((s) => s.key === "education")?.entries).toMatchObject([
      { id: "edu_1", bullets: [] },
    ]);
  });

  it("keeps every education entry even when the CV can't reach two pages", async () => {
    const result = await fitToTwoPages(longModelWithEducation(3, 2), () => Promise.resolve(3));

    expect(result.fits).toBe(false);
    expect(result.model.sections.find((s) => s.key === "education")?.entries).toHaveLength(1);
  });
});
