import { monthOf, PRESENT_WORDS } from "../lexicon/dates.js";
import { MULTIPLIERS, NUMBER_WORDS, PERCENT_WORD_PREFIXES } from "../lexicon/number-words.js";
import { fold, words } from "./text.js";

/** A number or percentage in a text, compared by value (language-independent). */
export interface NumberFact {
  value: number;
  isPercent: boolean;
  /** Original spelling, for feedback. */
  raw: string;
}

/** A date at the precision the text states: year, or year + month. */
export interface DateFact {
  year: number;
  month: number | null;
  raw: string;
}

export interface TextFacts {
  numbers: NumberFact[];
  dates: DateFact[];
  /** A date range ends in "present" (`2021 – obecnie`, `since 2020 to now`). */
  hasPresent: boolean;
}

const MIN_YEAR = 1900;
const MAX_YEAR = 2100;
const isYear = (value: number) => Number.isInteger(value) && value >= MIN_YEAR && value <= MAX_YEAR;

const NUMERIC =
  /(?<![\p{L}\p{N}])(\d{1,3}(?:\p{Zs}\d{3})+(?:[.,]\d+)?|\d+(?:[.,]\d+)*)(?:\s?([kKM])(?![\p{L}\p{N}]))?(?![\p{L}\p{N}])/gu;
const MONTH_YEAR = /(?<![\p{L}\p{N}])(0?[1-9]|1[0-2])[./-]((?:19|20)\d{2}|2100)(?![\p{L}\p{N}])/gu;
const YEAR_MONTH = /(?<![\p{L}\p{N}])((?:19|20)\d{2})[-/](0[1-9]|1[0-2])(?![\p{L}\p{N}])/gu;
const RANGE_END = /(?:[-–—]|\b(?:to|until|till|do|bis)\b)\s*([\p{L}]+)/gu;

/**
 * Parses a written number: spaces are thousands separators; with both `.` and `,` the last one is
 * the decimal mark; a single separator followed by exactly three digits (after at most three) is a
 * thousands separator (`1,500`, `10.000`), otherwise a decimal mark (`1,5`, `3.14`).
 */
export function parseNumeric(raw: string): number | null {
  const compact = raw.replace(/\p{Zs}/gu, "");
  const separators = compact.match(/[.,]/g) ?? [];
  let normalised = compact;
  if (separators.length > 0) {
    const last = Math.max(compact.lastIndexOf("."), compact.lastIndexOf(","));
    const kinds = new Set(separators);
    const digitsAfter = compact.length - last - 1;
    const isThousands =
      kinds.size === 1 && (separators.length > 1 || (digitsAfter === 3 && last <= 3));
    normalised = isThousands
      ? compact.replace(/[.,]/g, "")
      : `${compact.slice(0, last).replace(/[.,]/g, "")}.${compact.slice(last + 1)}`;
  }
  const value = Number(normalised);
  return Number.isFinite(value) ? value : null;
}

function isPercentAfter(text: string, end: number): boolean {
  const rest = text.slice(end);
  if (/^\s?%/.test(rest)) return true;
  const next = /^\s+([\p{L}]+)/u.exec(rest)?.[1];
  return (
    next !== undefined && PERCENT_WORD_PREFIXES.some((prefix) => fold(next).startsWith(prefix))
  );
}

function multiplierAfter(text: string, end: number): { factor: number; length: number } | null {
  const match = /^\s+([\p{L}]+)\.?/u.exec(text.slice(end));
  if (!match?.[1]) return null;
  const factor = MULTIPLIERS.get(fold(match[1]));
  return factor === undefined ? null : { factor, length: match[0].length };
}

/** A list number at the start of a line (`1.`, `2)`) is numbering, not a fact. */
function isListNumber(text: string, start: number, end: number): boolean {
  return text.slice(0, start).trim() === "" && /^[.)]\s/.test(text.slice(end));
}

/** Extracts the comparable facts of one text. Pure. */
export function extractFacts(text: string): TextFacts {
  const numbers: NumberFact[] = [];
  const dates: DateFact[] = [];
  const consumed: [number, number][] = [];
  const isConsumed = (start: number) => consumed.some(([from, to]) => start >= from && start < to);

  for (const match of text.matchAll(MONTH_YEAR)) {
    dates.push({ year: Number(match[2]), month: Number(match[1]), raw: match[0] });
    consumed.push([match.index, match.index + match[0].length]);
  }
  for (const match of text.matchAll(YEAR_MONTH)) {
    if (isConsumed(match.index)) continue;
    dates.push({ year: Number(match[1]), month: Number(match[2]), raw: match[0] });
    consumed.push([match.index, match.index + match[0].length]);
  }

  // Month name next to a year: "marzec 2021", "March 2021", "2021 März".
  const tokens = words(text);
  tokens.forEach((token, index) => {
    const month = monthOf(token.folded);
    if (month === null) return;
    const neighbour = [tokens[index + 1], tokens[index - 1]].find(
      (candidate) =>
        candidate !== undefined && /^\d{4}$/.test(candidate.raw) && isYear(Number(candidate.raw)),
    );
    if (!neighbour || isConsumed(neighbour.index)) return;
    dates.push({ year: Number(neighbour.raw), month, raw: `${token.raw} ${neighbour.raw}` });
    consumed.push([neighbour.index, neighbour.index + neighbour.raw.length]);
  });

  for (const match of text.matchAll(NUMERIC)) {
    const raw = match[1] ?? "";
    const start = match.index;
    const end = start + match[0].length;
    if (isConsumed(start) || isListNumber(text, start, end)) continue;
    const parsed = parseNumeric(raw);
    if (parsed === null) continue;
    const suffix = match[2];
    let value = parsed * (suffix === "M" ? 1_000_000 : suffix ? 1_000 : 1);
    let factEnd = end;
    if (!suffix) {
      const multiplier = multiplierAfter(text, end);
      if (multiplier) {
        value = parsed * multiplier.factor;
        factEnd = end + multiplier.length;
      }
    }
    const isPercent = isPercentAfter(text, factEnd);
    if (!isPercent && value === parsed && /^\d{4}$/.test(raw) && isYear(value)) {
      dates.push({ year: value, month: null, raw });
      continue;
    }
    numbers.push({ value, isPercent, raw: isPercent ? `${raw}%` : match[0].trim() });
  }

  // Spelled-out numbers ("pięć lat", "five teams").
  for (const token of tokens) {
    const value = NUMBER_WORDS.get(token.folded);
    if (value === undefined) continue;
    const isPercent = isPercentAfter(text, token.index + token.raw.length);
    numbers.push({ value, isPercent, raw: isPercent ? `${token.raw}%` : token.raw });
  }

  let hasPresent = false;
  for (const match of text.matchAll(RANGE_END)) {
    if (match[1] && PRESENT_WORDS.has(fold(match[1]))) hasPresent = true;
  }

  return { numbers, dates, hasPresent };
}

/** Value equality for numbers parsed from different spellings. */
export function sameNumber(a: number, b: number): boolean {
  return Math.abs(a - b) < 1e-9;
}
