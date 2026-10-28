import { monthOf } from "../lexicon/dates.js";
import {
  GENERIC_CAPITALISED,
  GENERIC_ROLE_WORDS,
  LANGUAGE_NAMES,
  LEGAL_SUFFIXES,
  ORGANISATION_PREPOSITIONS,
  TITLE_PREPOSITIONS,
} from "../lexicon/generic-words.js";
import { containsPhrase, stemEquals, words, type WordToken } from "../normalize/text.js";
import type { Finding, RuleContext } from "./context.js";

/** Words of legal forms (`Sp. z o.o.`, `GmbH`, `Ltd`), folded. */
const LEGAL_WORDS: ReadonlySet<string> = new Set([
  ...LEGAL_SUFFIXES.flatMap((suffix) => suffix.split(/[\s.]+/)),
  "o.o",
  "s.a",
]);

const MAX_NAME_WORDS = 4;

/** A name's distinctive words: legal-form words removed (`Acme Sp. z o.o.` → `acme`). */
function coreWords(name: readonly string[]): string[] {
  const core = name.filter((word) => !LEGAL_WORDS.has(word) && word.length > 0);
  return core.length > 0 ? core : [...name];
}

const isGenericName = (name: readonly string[]) =>
  name.every(
    (word) => GENERIC_CAPITALISED.has(word) || GENERIC_ROLE_WORDS.has(word) || word.length < 2,
  );

/** True when `candidate` names the same thing as one of `names` (stem-tolerant, any order). */
function matchesAny(candidate: readonly string[], names: readonly (readonly string[])[]): boolean {
  return names.some((name) => {
    const core = coreWords(name);
    return candidate.every((word) => core.some((known) => stemEquals(word, known)));
  });
}

const isCapitalised = (token: WordToken) => /^\p{Lu}/u.test(token.raw);

/** Runs of adjacent capitalised words (`Globex Corp`, `Acme Polska`). */
function capitalisedRuns(
  text: string,
  tokens: readonly WordToken[],
): { start: number; tokens: WordToken[] }[] {
  const runs: { start: number; tokens: WordToken[] }[] = [];
  let current: { start: number; tokens: WordToken[] } | null = null;
  tokens.forEach((token, index) => {
    const previous = tokens[index - 1];
    const isAdjacent =
      previous !== undefined &&
      /^[\s&-]*$/.test(text.slice(previous.index + previous.raw.length, token.index));
    if (isCapitalised(token) && current && isAdjacent && current.tokens.length < MAX_NAME_WORDS) {
      current.tokens.push(token);
    } else if (isCapitalised(token)) {
      current = { start: index, tokens: [token] };
      runs.push(current);
    } else {
      current = null;
    }
  });
  return runs;
}

/**
 * UNKNOWN_COMPANY / UNKNOWN_TITLE (ddd-02 decision 3, conservative):
 * - a company or title of the profile that the line names must belong to a cited entry;
 * - an unknown capitalised name counts as a company only when it looks like an organisation
 *   (legal-form suffix, or after "at" / "w" / "bei"), and isn't a known skill, place, month,
 *   language or generic word;
 * - a capitalised phrase after "as" / "jako" / "als" must match a cited title, ignoring generic
 *   role words (`Developer`, `programista`).
 */
export function unknownProperNouns({ line, facts, profile, skills }: RuleContext): Finding[] {
  const tokens = words(line.text);
  const folded = tokens.map((token) => token.folded);
  const findings: Finding[] = [];

  for (const company of profile.allCompanies) {
    const core = coreWords(company);
    if (isGenericName(core) || !containsPhrase(folded, core)) continue;
    if (!matchesAny(core, facts.companies))
      findings.push({ rule: "UNKNOWN_COMPANY", token: core.join(" ") });
  }
  for (const title of profile.allTitles) {
    const meaningful = title.filter((word) => !GENERIC_ROLE_WORDS.has(word));
    if (isGenericName(title) || meaningful.length === 0 || !containsPhrase(folded, title)) continue;
    if (!matchesAny(title, facts.titles))
      findings.push({ rule: "UNKNOWN_TITLE", token: title.join(" ") });
  }

  const isNotOrganisation = (name: readonly string[]) =>
    isGenericName(name) ||
    name.every(
      (word) =>
        GENERIC_CAPITALISED.has(word) ||
        LANGUAGE_NAMES.has(word) ||
        monthOf(word) !== null ||
        skills.isSkillName(word) ||
        skills.isKnown(word),
    ) ||
    matchesAny(name, facts.companies) ||
    matchesAny(name, facts.locations) ||
    matchesAny(name, profile.allLocations) ||
    matchesAny(name, profile.allCompanies);

  for (const run of capitalisedRuns(line.text, tokens)) {
    const runWords = run.tokens.map((token) => token.folded);
    const previous = folded[run.start - 1];
    const lastWord = runWords.at(-1) ?? "";
    const hasSuffix =
      LEGAL_WORDS.has(lastWord) ||
      /^\s*,?\s*(sp\.|s\.a\.|gmbh|ag\b|inc\b|ltd\b|llc\b|plc\b)/i.test(
        line.text.slice((run.tokens.at(-1)?.index ?? 0) + (run.tokens.at(-1)?.raw.length ?? 0)),
      );
    if (previous !== undefined && TITLE_PREPOSITIONS.has(previous)) {
      const meaningful = runWords.filter((word) => !GENERIC_ROLE_WORDS.has(word));
      const cited = facts.titles.flat();
      const isKnownTitle = meaningful.every((word) =>
        cited.some((known) => stemEquals(word, known)),
      );
      if (meaningful.length > 0 && !isKnownTitle) {
        findings.push({ rule: "UNKNOWN_TITLE", token: runWords.join(" ") });
      }
      continue;
    }
    const isOrganisationShaped =
      hasSuffix || (previous !== undefined && ORGANISATION_PREPOSITIONS.has(previous));
    const name = coreWords(runWords);
    if (isOrganisationShaped && !isNotOrganisation(name)) {
      findings.push({ rule: "UNKNOWN_COMPANY", token: name.join(" ") });
    }
  }
  return findings;
}
