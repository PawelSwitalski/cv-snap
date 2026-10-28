/** Per-case and total numbers of the regression suite (ddd-01 FixtureMetrics). */
export interface CaseMetrics {
  caseId: string;
  verified: number;
  unverified: number;
  skipped: number;
  seededCaught: number;
  seededTotal: number;
  /** Seeded fake facts that were verified: must stay 0 (story 008). */
  fabricatedVerified: number;
  injectionLeaks: number;
  durationsMs: { requirements: number; tailoring: number; total: number };
  model: string;
}

export interface SuiteTotals {
  cases: number;
  fabricatedVerified: number;
  seededCaught: number;
  seededTotal: number;
  injectionLeaks: number;
  /** Percentiles over recordings made with Sonnet 5.5 only (the NFR model), or null if none. */
  p50: { requirements: number; tailoring: number; total: number } | null;
  p95: { requirements: number; tailoring: number; total: number } | null;
}

/** Nearest-rank percentile of `values` (0–100). */
export function percentile(values: readonly number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const rank = Math.max(1, Math.ceil((p / 100) * sorted.length));
  return sorted[rank - 1] ?? 0;
}

const NFR_MODEL = "claude-sonnet-5-5";

export function totals(cases: readonly CaseMetrics[]): SuiteTotals {
  const sum = (pick: (metrics: CaseMetrics) => number) =>
    cases.reduce((acc, item) => acc + pick(item), 0);
  const timed = cases.filter((metrics) => metrics.model === NFR_MODEL);
  const at = (p: number) =>
    timed.length === 0
      ? null
      : {
          requirements: percentile(
            timed.map((metrics) => metrics.durationsMs.requirements),
            p,
          ),
          tailoring: percentile(
            timed.map((metrics) => metrics.durationsMs.tailoring),
            p,
          ),
          total: percentile(
            timed.map((metrics) => metrics.durationsMs.total),
            p,
          ),
        };
  return {
    cases: cases.length,
    fabricatedVerified: sum((metrics) => metrics.fabricatedVerified),
    seededCaught: sum((metrics) => metrics.seededCaught),
    seededTotal: sum((metrics) => metrics.seededTotal),
    injectionLeaks: sum((metrics) => metrics.injectionLeaks),
    p50: at(50),
    p95: at(95),
  };
}

/** Plain-text table for the test output. Counts and timings only, never plan text. */
export function formatReport(
  set: string,
  cases: readonly CaseMetrics[],
  isComplete: boolean,
): string {
  const rows = cases.map(
    (metrics) =>
      `  ${metrics.caseId.padEnd(24)} verified ${String(metrics.verified).padStart(3)}  unverified ${String(metrics.unverified).padStart(3)}  seeded ${String(metrics.seededCaught)}/${String(metrics.seededTotal)}  leaks ${String(metrics.injectionLeaks)}  total ${String(metrics.durationsMs.total)} ms`,
  );
  const total = totals(cases);
  const timing = total.p95
    ? `p95 (Sonnet 5.5): requirements ${String(total.p95.requirements)} ms, tailoring ${String(total.p95.tailoring)} ms, total ${String(total.p95.total)} ms`
    : "p95: no Sonnet 5.5 recordings yet";
  return [
    `Regression set "${set}" (${isComplete ? "complete" : "incomplete: needs ≥ 3 CVs and ≥ 20 ads with reviewed recordings"})`,
    ...rows,
    `  fabricated facts verified: ${String(total.fabricatedVerified)} (must be 0); seeded caught ${String(total.seededCaught)}/${String(total.seededTotal)}; injection leaks ${String(total.injectionLeaks)}`,
    `  ${timing}`,
  ].join("\n");
}
