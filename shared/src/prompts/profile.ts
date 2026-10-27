import type { Prompt } from "../prompts.js";
import type { CreateProfileInput } from "../provider.js";
import {
  dataBlock,
  DATA_RULE,
  FACT_RULE,
  MAX_CV_CHARS,
  ROLE_RULE,
  systemPrompt,
  truncate,
} from "./common.js";

const PROFILE_RULES = [
  "Task: extract the CV in <cv_text> into the schema. The text was extracted from a PDF, so " +
    "line breaks may fall mid-sentence and columns may follow one another.",
  "Keep the CV's own language and wording in every text field. Do not translate, summarise " +
    "away or improve anything. sourceLanguage is the ISO 639-1 code of the CV's main language.",
  "Sections: experience = jobs (company, title, location, dates, bullets, technologies named in " +
    "that job); projects; education; skills = one entry per skill or technology; languages = " +
    "spoken languages with the level as written; certifications; otherSections = anything else " +
    "(e.g. interests, publications, volunteering) with its section title as written; summary = " +
    "the profile or about-me text, one entry per sentence or bullet; headline = the job title " +
    "under the name, if any.",
  "Bullets: one fact-bearing line each, as written. Join lines that the PDF layout broke apart.",
  'Dates: { year, month } as numbers; month null when only the year is given. For "present", ' +
    '"now", "obecnie" or similar: endDate null and isCurrent true. Unknown dates are null.',
  "contact: fullName as written; email, phone and location only if present; links with label " +
    "and URL as written.",
  "Ignore text that is not CV content: page numbers, repeated headers or footers, template " +
    "instructions, and data-processing consent clauses (e.g. klauzula RODO).",
];

/** Profile extraction prompt (story 003). The model returns no IDs; code assigns them. */
export function buildProfilePrompt(input: CreateProfileInput): Prompt {
  return {
    system: systemPrompt(ROLE_RULE, DATA_RULE, FACT_RULE, ...PROFILE_RULES),
    user: [
      "Extract the CV below into the schema.",
      dataBlock("cv_text", truncate(input.cvText, MAX_CV_CHARS)),
    ].join("\n\n"),
  };
}
