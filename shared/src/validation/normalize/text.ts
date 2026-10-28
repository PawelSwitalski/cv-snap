/**
 * Text folding for language-independent comparison: lower case, diacritics removed (ł → l, ß → ss),
 * whitespace collapsed. Pure helpers shared by every rule.
 */
export function fold(text: string): string {
  return text
    .toLowerCase()
    .replace(/ł/g, "l")
    .replace(/ß/g, "ss")
    .normalize("NFD")
    .replace(/\p{M}+/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

export interface WordToken {
  /** Original spelling. */
  raw: string;
  /** Folded spelling. */
  folded: string;
  /** Character offset in the line. */
  index: number;
}

/**
 * Words of a line: letters and digits, keeping tech punctuation inside a word (`Node.js`, `C#`,
 * `C++`, `CI/CD`, `.NET`). Trailing sentence punctuation is dropped.
 */
export function words(text: string): WordToken[] {
  const result: WordToken[] = [];
  for (const match of text.matchAll(
    /\.?[\p{L}\p{N}][\p{L}\p{N}.#+/_-]*[\p{L}\p{N}#+]|[\p{L}\p{N}]/gu,
  )) {
    const raw = match[0].replace(/[.]+$/, "");
    if (!raw) continue;
    result.push({ raw, folded: fold(raw), index: match.index });
  }
  return result;
}

/** Minimum shared stem for inflection-tolerant matching: max(4, shorter length − 3). */
function stemLength(a: string, b: string): number {
  return Math.max(4, Math.min(a.length, b.length) - 3);
}

/**
 * Inflection-tolerant equality of two folded words (`google` ~ `googlu`, `acme` ~ `acmie`,
 * `warszawa` ~ `warszawie`): equal, or sharing a stem of max(4, length − 3) characters. Short
 * words must match exactly.
 */
export function stemEquals(a: string, b: string): boolean {
  if (a === b) return true;
  if (a.length < 4 || b.length < 4) return false;
  const length = stemLength(a, b);
  return a.slice(0, length) === b.slice(0, length);
}

/** Folded words of a phrase, ignoring punctuation-only tokens. */
export function phraseWords(phrase: string): string[] {
  return words(phrase).map((token) => token.folded);
}

/**
 * True when every word of `phrase` stem-matches a consecutive run of words in `text` (both folded
 * word lists). Used to find a known company or title inside a line in any inflected form.
 */
export function containsPhrase(text: readonly string[], phrase: readonly string[]): boolean {
  if (phrase.length === 0 || phrase.length > text.length) return false;
  for (let start = 0; start + phrase.length <= text.length; start++) {
    if (phrase.every((word, offset) => stemEquals(text[start + offset] ?? "", word))) return true;
  }
  return false;
}

/** True when the character at `index` in `text` begins a sentence (start, or after . ! ? : •). */
export function isSentenceStart(text: string, index: number): boolean {
  const before = text.slice(0, index).trimEnd();
  return before.length === 0 || /[.!?:•\-–—]$/.test(before);
}
