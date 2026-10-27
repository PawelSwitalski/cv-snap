import { z } from "zod";

/**
 * Size caps for everything Claude returns (also sent with `--json-schema`). They bound each reply
 * well under Chrome's 1 MB host → extension limit; real CVs and plans are 10–40 KB.
 */
export const LIMITS = {
  /** Items per profile section or plan list. */
  sectionItems: 40,
  /** Bullets per item. */
  bullets: 30,
  /** One CV line: bullet, summary sentence, requirement. */
  lineChars: 1000,
  /** Names, titles, labels, URLs. */
  shortChars: 300,
  /** Skills, keywords or requirements per list. */
  listItems: 80,
} as const;

export const LineTextSchema = z.string().min(1).max(LIMITS.lineChars);
export const ShortTextSchema = z.string().min(1).max(LIMITS.shortChars);
export const OptionalShortTextSchema = z.string().max(LIMITS.shortChars).nullable();
