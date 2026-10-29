import { languageKey } from "../lexicon/generic-words.js";
import { fold, stemEquals } from "../normalize/text.js";
import type { Finding, RuleContext } from "./context.js";

/**
 * UNKNOWN_SKILL: every skill or technology the line names must resolve, through the alias index,
 * to a skill of the profile. A skills-list line must resolve as a whole.
 */
export function unknownSkills({ line, skills, profile }: RuleContext): Finding[] {
  if (line.kind === "skill") {
    // "English (B2)", "angielski: C1": the language name is the part before the level.
    const languagePart = fold(line.text.split(/[(:–—-]/)[0] ?? line.text).trim();
    const isKnown =
      skills.isKnown(line.text) ||
      profile.skillNames.some((name) => stemEquals(fold(name), fold(line.text))) ||
      profile.languageNames.some((name) => {
        const key = languageKey(fold(name));
        return (
          stemEquals(fold(name), languagePart) ||
          (key !== null && key === languageKey(languagePart))
        );
      });
    return isKnown ? [] : [{ rule: "UNKNOWN_SKILL", token: fold(line.text) }];
  }
  return skills
    .mentions(line.text)
    .filter((mention) => !skills.isKnown(mention.canonical))
    .map((mention) => ({ rule: "UNKNOWN_SKILL" as const, token: mention.token }));
}
