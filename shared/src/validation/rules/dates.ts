import type { TextFacts } from "../normalize/facts.js";
import type { Finding, RuleContext } from "./context.js";

/**
 * UNKNOWN_DATE: every date in the line must appear in its cited sources, at the precision the line
 * states (`2021` matches a source `03/2021`; `03/2021` doesn't match a source that only says
 * `2021`). A range ending in "present" needs a current cited item.
 */
export function unknownDates({ facts }: RuleContext, line: TextFacts): Finding[] {
  const findings: Finding[] = line.dates
    .filter(
      (date) =>
        !facts.dates.some(
          (source) =>
            source.year === date.year && (date.month === null || source.month === date.month),
        ),
    )
    .map((date) => ({
      rule: "UNKNOWN_DATE" as const,
      token:
        date.month === null
          ? String(date.year)
          : `${String(date.month).padStart(2, "0")}/${String(date.year)}`,
    }));
  if (line.hasPresent && !facts.hasCurrent)
    findings.push({ rule: "UNKNOWN_DATE", token: "present" });
  return findings;
}
