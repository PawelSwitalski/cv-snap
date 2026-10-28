import type { PlanLineRef } from "../plan-lines.js";
import type { ProfileIndex } from "../source-facts.js";
import type { Finding } from "./context.js";

/**
 * UNKNOWN_SOURCE: a line without citations, citing an ID the profile doesn't have, or (bullets)
 * belonging to a plan item whose profile ID doesn't exist. Same check as bolt 005's
 * `unresolvedCitations`, reported per line. When it fires, no other rule runs for the line.
 */
export function unknownSources(line: PlanLineRef, profile: ProfileIndex): Finding[] {
  if (line.sourceIds.length === 0) return [{ rule: "UNKNOWN_SOURCE", token: "(none)" }];
  const ids =
    line.parentProfileId === null ? line.sourceIds : [line.parentProfileId, ...line.sourceIds];
  return ids
    .filter((id) => !profile.has(id))
    .map((id) => ({ rule: "UNKNOWN_SOURCE" as const, token: id }));
}
