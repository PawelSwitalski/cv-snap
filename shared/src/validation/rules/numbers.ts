import { sameNumber, type TextFacts } from "../normalize/facts.js";
import type { Finding, RuleContext } from "./context.js";

/**
 * UNKNOWN_NUMBER / UNKNOWN_PERCENTAGE: every number and percentage in the line must appear in its
 * cited sources (strict, ddd-02 decision 3). Values are compared after normalisation, so `40 000`,
 * `40,000` and `40k` are equal, and `40%` never matches `40`.
 */
export function unknownNumbers({ facts }: RuleContext, line: TextFacts): Finding[] {
  return line.numbers
    .filter(
      (number) =>
        !facts.numbers.some(
          (source) =>
            source.isPercent === number.isPercent && sameNumber(source.value, number.value),
        ),
    )
    .map((number) => ({
      rule: number.isPercent ? ("UNKNOWN_PERCENTAGE" as const) : ("UNKNOWN_NUMBER" as const),
      token: number.isPercent ? `${String(number.value)}%` : String(number.value),
    }));
}
