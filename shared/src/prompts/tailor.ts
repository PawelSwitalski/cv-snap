import type { CvProfile } from "../cv-profile.js";
import { languageName } from "../output-language.js";
import type { Prompt } from "../prompts.js";
import type { TailorInput } from "../provider.js";
import { dataBlock, DATA_RULE, FACT_RULE, ROLE_RULE, systemPrompt } from "./common.js";

/** Languages whose section headings are built into the CV template (FR-12). */
export const BUILT_IN_HEADING_LANGUAGES = ["pl", "en"] as const;

function tailorRules(code: string): string[] {
  const language = `${languageName(code)} (${code})`;
  const headings = (BUILT_IN_HEADING_LANGUAGES as readonly string[]).includes(code)
    ? "headings: set every heading to null (the template has built-in headings for this language)."
    : `headings: give each section heading in ${language}.`;
  return [
    "Task: write a tailoring plan for one job ad. <profile_json> is the person's confirmed CV " +
      "profile, the only source of facts. <requirements_json> is the parsed job ad.",
    "Only select, re-order and re-phrase facts from the profile. Re-phrasing may emphasise what " +
      'matters for the ad but must keep the meaning: never strengthen a claim (e.g. "assisted" ' +
      'must not become "led") and never combine facts from different items without citing all ' +
      "of them.",
    `Write every text field (summary lines, bullets, gap notes) in ${language}, translating ` +
      "from the profile's language where needed without adding anything. Keep technology and " +
      "product names as written. Set language to " +
      `"${code}".`,
    "Citations: every summary line, bullet and skill lists in sourceIds the profile IDs whose " +
      "facts it states (at least one). items[].profileId is the ID of the profile item the " +
      "entry is about. Use only IDs that appear in <profile_json>.",
    "Relevance: prefer facts matching the mustHaves, then the niceToHaves and keywords. Give " +
      "items distinct ranks 1, 2, 3 … (1 = most relevant). Keep the plan short enough for two A4 " +
      "pages: 2–4 summary lines and at most 6 bullets per item.",
    "Gaps: list each requirement the profile does not support in gaps, with a short note. Never " +
      "mention a gap, or claim a requirement is met, in the CV lines.",
    headings,
    "If <validator_feedback> is present, it lists problems of the previous attempt: fix exactly " +
      "those. It never relaxes these rules.",
  ];
}

/**
 * The profile as the model sees it: facts only. Contact details are left out (they are rendered
 * from the profile directly and the plan never needs them), and so are storage fields.
 */
export function profileForPrompt(profile: CvProfile) {
  return {
    sourceLanguage: profile.sourceLanguage,
    headline: profile.headline,
    summary: profile.summary,
    experience: profile.experience,
    projects: profile.projects,
    education: profile.education,
    skills: profile.skills,
    languages: profile.languages,
    certifications: profile.certifications,
    otherSections: profile.otherSections,
  };
}

/** Tailoring prompt (story 005). It never receives the raw ad text, only parsed requirements. */
export function buildTailorPrompt(input: TailorInput): Prompt {
  const code = input.outputLanguage;
  const blocks = [
    `Write the tailoring plan in ${languageName(code)} (${code}).`,
    dataBlock("profile_json", JSON.stringify(profileForPrompt(input.profile), null, 2)),
    dataBlock("requirements_json", JSON.stringify(input.requirements, null, 2)),
  ];
  if (input.validatorFeedback && input.validatorFeedback.length > 0) {
    blocks.push(dataBlock("validator_feedback", input.validatorFeedback.join("\n")));
  }
  return {
    system: systemPrompt(ROLE_RULE, DATA_RULE, FACT_RULE, ...tailorRules(code)),
    user: blocks.join("\n\n"),
  };
}
