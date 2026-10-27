import {
  CvSnapError,
  decideOutputLanguage,
  unresolvedCitations,
  type CvGenerationProvider,
  type CvProfile,
  type JobRequirements,
  type LanguageCode,
  type OutputLanguage,
  type PlanHeadings,
  type ProviderCallOptions,
  type TailoringPlan,
} from "@cv-snap/shared";

export interface TailoringRequest {
  /** Must be confirmed: the confirmed profile is the only source of facts (FR-5). */
  profile: CvProfile;
  requirements: JobRequirements;
  /** The user's language override for this generation only (FR-12), or null. */
  override: LanguageCode | null;
  /** Validator errors from the previous attempt; set by the pipeline's single retry (bolt 006). */
  validatorFeedback: string[] | null;
}

export interface TailoringResult {
  plan: TailoringPlan;
  outputLanguage: OutputLanguage;
}

/**
 * A plan that broke a domain invariant (wrong language, citations that don't resolve). Retryable
 * like other invalid output; `issues` lists plan paths and IDs only, never text, so the pipeline
 * can pass them back as validator feedback.
 */
export class InvalidPlanError extends CvSnapError {
  readonly issues: string[];

  constructor(issues: string[]) {
    super("GENERATION_FAILED", "The tailoring plan broke a domain rule", {
      reason: "INVALID_OUTPUT",
    });
    this.issues = issues;
  }
}

/**
 * Tailoring use case (story 005): decides the output language, asks for a plan and checks the
 * plan's language and citations. It never retries; the pipeline (bolt 006) retries once with
 * feedback.
 */
export class Tailoring {
  constructor(private readonly provider: CvGenerationProvider) {}

  async tailor(request: TailoringRequest, options: ProviderCallOptions): Promise<TailoringResult> {
    const { profile, requirements } = request;
    if (profile.confirmedAt === null) {
      throw new CvSnapError("GENERATION_FAILED", "The profile must be confirmed before tailoring", {
        reason: "PROFILE_NOT_CONFIRMED",
      });
    }
    const outputLanguage = decideOutputLanguage(
      requirements,
      request.override,
      profile.sourceLanguage,
    );
    const plan = await this.provider.tailor(
      {
        profile,
        requirements,
        outputLanguage: outputLanguage.code,
        validatorFeedback: request.validatorFeedback,
      },
      options,
    );

    const issues: string[] = [];
    if (plan.language !== outputLanguage.code) {
      issues.push(`language is "${plan.language}", expected "${outputLanguage.code}"`);
    }
    for (const missing of unresolvedCitations(plan, profile)) {
      issues.push(`${missing.path} cites unknown id "${missing.id}"`);
    }
    for (const key of missingHeadings(plan, profile)) {
      issues.push(`headings.${key} is missing for language "${outputLanguage.code}"`);
    }
    if (issues.length > 0) throw new InvalidPlanError(issues);
    return { plan, outputLanguage };
  }
}

/** Languages whose section headings are built into the CV template (FR-12). */
const BUILT_IN_HEADING_LANGUAGES: readonly string[] = ["pl", "en"];

/**
 * Story 005: for a language without built-in headings, the plan must name every section the CV
 * will show in that language; otherwise the template would fall back to English labels.
 */
export function missingHeadings(plan: TailoringPlan, profile: CvProfile): (keyof PlanHeadings)[] {
  if (BUILT_IN_HEADING_LANGUAGES.includes(plan.language)) return [];
  const itemIds = (items: { id: string }[]) => new Set(items.map((item) => item.id));
  const experience = itemIds(profile.experience);
  const projects = itemIds(profile.projects);
  const education = itemIds(profile.education);
  const cites = (ids: Set<string>) => plan.items.some((item) => ids.has(item.profileId));
  const shown: Record<keyof PlanHeadings, boolean> = {
    summary: plan.summary.length > 0,
    experience: cites(experience),
    projects: cites(projects),
    education: cites(education),
    skills: plan.skills.length > 0,
    languages: profile.languages.length > 0,
    certifications: profile.certifications.length > 0,
  };
  return (Object.keys(shown) as (keyof PlanHeadings)[]).filter(
    (key) => shown[key] && !plan.headings[key]?.trim(),
  );
}
