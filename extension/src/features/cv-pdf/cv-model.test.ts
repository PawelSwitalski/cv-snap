import { describe, expect, it } from "vitest";
import { buildLongCv, smallPlan, smallProfile } from "../../../test/cv-fixtures";
import { buildCvModel, formatDate, formatRange } from "./cv-model";

describe("buildCvModel", () => {
  it("builds the header from the profile and leaves the photo out when there is none", () => {
    const model = buildCvModel(smallProfile(), smallPlan());

    expect(model.header).toEqual({
      fullName: "Jan Testowy",
      headline: "Frontend Developer",
      contactLines: ["jan.testowy@example.com", "Kraków", "https://github.com/example"],
      photoDataUrl: null,
    });
    expect(model.clause).toBeNull();
  });

  it("passes the photo and the clause through verbatim", () => {
    const model = buildCvModel(smallProfile(), smallPlan(), {
      photoDataUrl: "data:image/png;base64,AAAA",
      clause: "Wyrażam zgodę …",
    });

    expect(model.header.photoDataUrl).toBe("data:image/png;base64,AAAA");
    expect(model.clause).toBe("Wyrażam zgodę …");
  });

  it("orders sections: summary, ranked items, skills, languages, certifications", () => {
    const model = buildCvModel(smallProfile(), smallPlan());

    expect(model.sections.map((section) => section.key)).toEqual([
      "summary",
      "experience",
      "skills",
      "languages",
      "certifications",
    ]);
    expect(model.sections[0]?.heading).toBe("Podsumowanie");
  });

  it("prints plan bullets as written and sorts entries by rank", () => {
    const plan = smallPlan();
    plan.items.reverse();

    const experience = buildCvModel(smallProfile(), plan).sections.find(
      (section) => section.key === "experience",
    );

    expect(experience?.entries.map((entry) => [entry.id, entry.rank])).toEqual([
      ["exp_acme", 1],
      ["exp_beta", 2],
    ]);
    expect(experience?.entries[0]?.bullets).toEqual([
      "Przeprowadził migrację aplikacji do TypeScript.",
    ]);
    expect(experience?.entries[0]?.dates).toBe("03/2021 – obecnie");
  });

  it("leaves the employer out when a job has none (never prints a placeholder)", () => {
    const profile = smallProfile();
    const job = profile.experience.find((item) => item.id === "exp_acme");
    if (!job) throw new Error("fixture changed");
    job.company = null;

    const entry = buildCvModel(profile, smallPlan())
      .sections.find((section) => section.key === "experience")
      ?.entries.find((item) => item.id === "exp_acme");

    expect(entry?.subtitle).toBe(job.location ?? "");
    expect(JSON.stringify(entry)).not.toMatch(/unknown|null/i);
  });

  it("keeps a repeated plan item once, at its best rank", () => {
    const plan = smallPlan();
    plan.items.push({ profileId: "exp_acme", rank: 5, bullets: [] });

    const experience = buildCvModel(smallProfile(), plan).sections.find(
      (section) => section.key === "experience",
    );

    expect(experience?.entries.map((entry) => entry.id)).toEqual(["exp_acme", "exp_beta"]);
    expect(experience?.entries[0]?.rank).toBe(1);
  });

  it("skips plan items that don't exist in the profile", () => {
    const plan = smallPlan();
    plan.items.push({ profileId: "exp_ghost", rank: 3, bullets: [] });

    const ids = buildCvModel(smallProfile(), plan).sections.flatMap((section) =>
      section.entries.map((entry) => entry.id),
    );

    expect(ids).not.toContain("exp_ghost");
  });

  it("places project and education sections in the order of their best-ranked item", () => {
    const plan = smallPlan();
    plan.items = [
      { profileId: "edu_agh", rank: 1, bullets: [] },
      { profileId: "prj_cvsnap", rank: 2, bullets: [] },
      { profileId: "exp_acme", rank: 3, bullets: [] },
    ];

    const keys = buildCvModel(smallProfile(), plan).sections.map((section) => section.key);

    expect(keys.slice(1, 4)).toEqual(["education", "projects", "experience"]);
  });

  it("uses the plan's headings for a language without built-in labels", () => {
    const plan = { ...smallPlan(), language: "de" };
    plan.headings = { ...plan.headings, experience: "Berufserfahrung" };

    const model = buildCvModel(smallProfile(), plan);

    expect(model.sections.find((s) => s.key === "experience")?.heading).toBe("Berufserfahrung");
    expect(model.sections.find((s) => s.key === "skills")?.heading).toBe("Skills");
  });

  it("is deterministic for the same input", () => {
    const { profile, plan } = buildLongCv(3, 2);

    expect(buildCvModel(profile, plan)).toEqual(buildCvModel(profile, plan));
  });
});

describe("formatDate / formatRange", () => {
  it("formats month precision and year-only dates language-neutrally", () => {
    expect(formatDate({ year: 2021, month: 3 })).toBe("03/2021");
    expect(formatDate({ year: 2019, month: null })).toBe("2019");
  });

  it("uses a localized 'present' for PL/EN and an open range otherwise", () => {
    const start = { year: 2021, month: 3 };

    expect(formatRange(start, null, true, "pl")).toBe("03/2021 – obecnie");
    expect(formatRange(start, null, true, "en")).toBe("03/2021 – present");
    expect(formatRange(start, null, true, "de")).toBe("03/2021 –");
    expect(formatRange(start, { year: 2022, month: 1 }, false, "en")).toBe("03/2021 – 01/2022");
    expect(formatRange(null, { year: 2022, month: null }, false, "en")).toBe("2022");
    expect(formatRange(start, null, false, "en")).toBe("03/2021");
    expect(formatRange(null, null, false, "en")).toBeNull();
  });
});
