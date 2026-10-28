import type { SkillAliasIndex } from "../normalize/skills.js";
import type { PlanLineRef } from "../plan-lines.js";
import type { ProfileIndex, SourceFacts } from "../source-facts.js";
import type { ValidationRule } from "../types.js";

/** What every rule sees for one line. */
export interface RuleContext {
  line: PlanLineRef;
  facts: SourceFacts;
  profile: ProfileIndex;
  skills: SkillAliasIndex;
}

/** A rule's finding: the rule and the offending (normalised) token. */
export interface Finding {
  rule: ValidationRule;
  token: string;
}

export type Rule = (context: RuleContext) => Finding[];
