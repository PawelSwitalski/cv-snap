import { SKILL_ALIAS_GROUPS } from "../lexicon/skills.js";
import { baseFormCandidates, fold, words, type WordToken } from "./text.js";

/** Built-in alias → canonical skill ID, built once. */
const BUILT_IN_ALIASES: ReadonlyMap<string, string> = new Map(
  SKILL_ALIAS_GROUPS.flatMap((group) => {
    const canonical = group[0] ?? "";
    return group.map((alias) => [alias, canonical] as const);
  }),
);

/** Single-word aliases that are also everyday words; only a capitalised or tech spelling counts. */
const AMBIGUOUS_ALIASES: ReadonlySet<string> = new Set([
  "c",
  "go",
  "rest",
  "node",
  "spring",
  "elastic",
  "excel",
  "git",
  "sap",
  "swift",
  "rust",
  "java",
]);

const MAX_PHRASE_WORDS = 3;

export interface SkillMention {
  canonical: string;
  /** Folded spelling as written, for feedback. */
  token: string;
}

/**
 * Skills known for one profile (ddd-01 SkillAliasIndex): the built-in alias table plus every
 * skill name the profile uses. Resolves any alias to a canonical ID and finds skill mentions in a
 * line.
 */
export class SkillAliasIndex {
  private readonly aliases = new Map(BUILT_IN_ALIASES);
  private readonly known = new Set<string>();

  constructor(profileSkillNames: readonly string[], profileTexts: readonly string[]) {
    for (const name of profileSkillNames) {
      const folded = fold(name);
      if (!folded) continue;
      const canonical = this.aliases.get(folded) ?? folded;
      this.aliases.set(folded, canonical);
      this.known.add(canonical);
    }
    // Skills written anywhere in the confirmed profile are facts of the profile too.
    for (const text of profileTexts) {
      for (const mention of this.mentions(text)) this.known.add(mention.canonical);
    }
  }

  canonical(name: string): string {
    const folded = fold(name);
    return this.aliases.get(folded) ?? folded;
  }

  /** True when the word is a skill name at all (built-in table or the profile), known or not. */
  isSkillName(name: string): boolean {
    return this.aliases.has(fold(name));
  }

  /** True when the profile has this skill under any alias. */
  isKnown(name: string): boolean {
    return this.known.has(this.canonical(name));
  }

  /** Skill mentions in a text: alias phrases (up to three words) and tech-shaped words. */
  mentions(text: string): SkillMention[] {
    const tokens = words(text);
    const found: SkillMention[] = [];
    let index = 0;
    while (index < tokens.length) {
      const match = this.matchAlias(tokens, index);
      if (match) {
        found.push({ canonical: match.canonical, token: match.token });
        index += match.length;
        continue;
      }
      const token = tokens[index];
      if (token && isTechShaped(token.raw)) {
        found.push({ canonical: this.canonical(token.raw), token: token.folded });
      }
      index++;
    }
    return found;
  }

  private matchAlias(
    tokens: readonly WordToken[],
    start: number,
  ): { canonical: string; token: string; length: number } | null {
    for (let length = MAX_PHRASE_WORDS; length >= 1; length--) {
      const slice = tokens.slice(start, start + length);
      if (slice.length < length) continue;
      const phrase = slice.map((token) => token.folded).join(" ");
      const first = slice[0];
      // A single word may carry a Polish case ending ("w Kubernetesie", "z Dockerem"): resolve
      // it through its base forms, so an inflected skill is neither missed nor taken for a name.
      const bases = length === 1 ? baseFormCandidates(phrase) : [phrase];
      for (const base of bases) {
        const canonical = this.aliases.get(base);
        if (canonical === undefined) continue;
        if (length === 1 && first && AMBIGUOUS_ALIASES.has(base) && !looksLikeTech(first.raw)) {
          continue;
        }
        return { canonical, token: phrase, length };
      }
    }
    return null;
  }
}

/** A capitalised or punctuated spelling: `Go`, `C#`, `.NET` (not "go" or "rest"). */
function looksLikeTech(raw: string): boolean {
  return /[\p{Lu}.#+]/u.test(raw);
}

/**
 * Words that look like technology names even when the alias table doesn't know them: inner
 * punctuation (`Node.js`, `C#`, `C++`), letters mixed with digits (`S3`, `HTML5`) or inner capitals
 * (`TypeScript`, `GraphQL`).
 */
export function isTechShaped(raw: string): boolean {
  if (/^[\d.,]+$/.test(raw)) return false;
  if (/[#+]/.test(raw) || /\p{L}\.\p{L}/u.test(raw) || /^\.\p{L}/u.test(raw)) return true;
  if (/\p{L}/u.test(raw) && /\d/.test(raw) && raw.length <= 12) return true;
  return /^\p{Lu}?\p{Ll}+\p{Lu}/u.test(raw);
}
