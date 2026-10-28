import type { CvProfileContent } from "../cv-profile.js";
import type { TailoringPlan } from "../tailoring-plan.js";
import { extractFacts } from "./normalize/facts.js";
import { SkillAliasIndex } from "./normalize/skills.js";
import { planLines } from "./plan-lines.js";
import type { Finding, RuleContext } from "./rules/context.js";
import { unknownDates } from "./rules/dates.js";
import { unknownNumbers } from "./rules/numbers.js";
import { unknownProperNouns } from "./rules/proper-nouns.js";
import { unknownSkills } from "./rules/skills.js";
import { unknownSources } from "./rules/source.js";
import { ProfileIndex } from "./source-facts.js";
import {
  MAX_TOKEN_CHARS,
  type LineId,
  type LineVerdict,
  type ValidatePlanOptions,
  type ValidationRun,
  type Violation,
} from "./types.js";

export interface ValidateOptions extends ValidatePlanOptions {
  /** Lines the user removed: left out of the result (they won't be in the CV). */
  removedLineIds?: readonly LineId[];
}

/**
 * The deterministic validator (story 006, FR-11): checks every summary line, bullet and skill of a
 * plan against the facts of the lines it cites in the confirmed profile. Pure, no I/O, no LLM; the
 * same plan and profile always give the same run. Headings and gaps are never validated.
 */
export function validatePlan(
  plan: TailoringPlan,
  profile: CvProfileContent,
  options: ValidateOptions = {},
): ValidationRun {
  const index = new ProfileIndex(profile);
  const skills = new SkillAliasIndex(index.skillNames, index.allTexts);
  const edited = new Set(options.userEditedLineIds ?? []);
  const removed = new Set(options.removedLineIds ?? []);

  const results: LineVerdict[] = [];
  for (const line of planLines(plan)) {
    if (removed.has(line.lineId)) continue;
    if (edited.has(line.lineId)) {
      results.push({ lineId: line.lineId, kind: line.kind, status: "skipped", violations: [] });
      continue;
    }
    let findings = unknownSources(line, index);
    if (findings.length === 0) {
      const context: RuleContext = {
        line,
        facts: index.factsFor(line.sourceIds, line.parentProfileId),
        profile: index,
        skills,
      };
      if (line.kind === "skill") {
        findings = unknownSkills(context);
      } else {
        const lineFacts = extractFacts(line.text);
        findings = [
          ...unknownNumbers(context, lineFacts),
          ...unknownDates(context, lineFacts),
          ...unknownSkills(context),
          ...unknownProperNouns(context),
        ];
      }
    }
    const violations = dedupe(findings).map((finding): Violation => ({
      rule: finding.rule,
      lineId: line.lineId,
      token: finding.token.slice(0, MAX_TOKEN_CHARS),
    }));
    results.push({
      lineId: line.lineId,
      kind: line.kind,
      status: violations.length === 0 ? "verified" : "unverified",
      violations,
    });
  }

  const count = (status: LineVerdict["status"]) =>
    results.filter((result) => result.status === status).length;
  return {
    planLanguage: plan.language,
    results,
    summary: {
      verified: count("verified"),
      unverified: count("unverified"),
      skipped: count("skipped"),
    },
    violationCount: results.reduce((sum, result) => sum + result.violations.length, 0),
  };
}

function dedupe(findings: readonly Finding[]): Finding[] {
  const seen = new Set<string>();
  return findings.filter((finding) => {
    const key = `${finding.rule}\u0000${finding.token}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
