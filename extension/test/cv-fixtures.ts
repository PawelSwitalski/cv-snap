import {
  CvProfileSchema,
  TailoringPlanSchema,
  type CvProfile,
  type TailoringPlan,
} from "@cv-snap/shared";
// JSON imports work in every Vitest environment (happy-dom URLs aren't file paths).
import planJson from "../../shared/test/fixtures/plan.valid.json";
import profileJson from "../../shared/test/fixtures/profile.valid.json";

/**
 * Synthetic CV data for cv-pdf tests (a fictional person; never real CVs). The small profile/plan
 * come from `shared/test/fixtures`; `buildLongCv` makes a CV that needs more than two pages.
 * Every call returns a fresh copy, so tests may modify it.
 */
export function smallProfile(): CvProfile {
  return CvProfileSchema.parse(structuredClone(profileJson));
}

export function smallPlan(): TailoringPlan {
  return TailoringPlanSchema.parse(structuredClone(planJson));
}

/** A profile + plan with `items` ranked experience entries of `bullets` long bullets each. */
export function buildLongCv(items = 12, bullets = 6): { profile: CvProfile; plan: TailoringPlan } {
  const base = smallProfile();
  const experience = Array.from({ length: items }, (_, index) => {
    const n = index + 1;
    return {
      id: `exp_${String(n)}`,
      company: `Firma Testowa ${String(n)} Sp. z o.o.`,
      title: `Inżynier oprogramowania ${String(n)}`,
      location: "Łódź",
      startDate: { year: 2000 + n, month: 1 },
      endDate: { year: 2001 + n, month: 12 },
      isCurrent: false,
      bullets: Array.from({ length: bullets }, (_, b) => ({
        id: `exp_${String(n)}_b${String(b + 1)}`,
        text: `Zadanie ${String(b + 1)} w firmie ${String(n)}: zespół, jakość, wydajność i dokumentacja.`,
      })),
      skills: ["TypeScript"],
    };
  });
  const profile = CvProfileSchema.parse({ ...base, experience, projects: [], education: [] });
  const plan = TailoringPlanSchema.parse({
    ...smallPlan(),
    items: experience.map((item, index) => ({
      profileId: item.id,
      rank: index + 1,
      bullets: item.bullets.map((bullet) => ({
        text: `${bullet.text} Szczegółowy opis osiągnięć, który zajmuje więcej niż jedną linię tekstu.`,
        sourceIds: [bullet.id],
      })),
    })),
  });
  return { profile, plan };
}
