import { readFileSync } from "node:fs";

/**
 * Personal-data check for regression fixtures (story 008, ddd-01 FixturePrivacyCheck): e-mail
 * addresses, phone numbers and street addresses. Fake contact data must use reserved forms
 * (`*@example.com`, `+48 000 000 000`), which are allowed.
 *
 * Self-contained (no project imports) so the pre-commit hook can run it directly with Node:
 * `node shared/test/regression/privacy-check.ts <files…>` exits 1 on any finding.
 */

export interface PrivacyFinding {
  kind: "email" | "phone" | "address";
  /** The match with letters and digits masked, so the report doesn't repeat the data. */
  masked: string;
}

const EMAIL = /[A-Za-z0-9._%+-]+@((?:[A-Za-z0-9-]+\.)+[A-Za-z]{2,})/g;
const ALLOWED_EMAIL_DOMAIN = /(^|\.)example\.(com|org|net|pl|de)$|\.(test|invalid)$/i;
const PHONE = /(?<![\w.:/-])(?:\+\d{2,3}[\s-]?)?\d{3}[\s-]?\d{3}[\s-]?\d{3}(?![\w-])/g;
const STREET_PL =
  /\b(?:ul\.|ulica|al\.|aleja|os\.|pl\.)\s*\p{Lu}[\p{L}-]+(?:\s\p{Lu}[\p{L}-]+)*\s+\d+[a-zA-Z]?/gu;
const STREET_EN = /\b\d+\s+\p{Lu}\p{L}+\s+(?:Street|St|Avenue|Ave|Road|Rd|Lane|Ln)\b/gu;

const mask = (text: string) => text.replace(/[\p{L}\p{N}]/gu, "•");

/** Personal data found in a text (empty when clean). */
export function scanText(text: string): PrivacyFinding[] {
  const findings: PrivacyFinding[] = [];
  for (const match of text.matchAll(EMAIL)) {
    if (!ALLOWED_EMAIL_DOMAIN.test(match[1] ?? ""))
      findings.push({ kind: "email", masked: mask(match[0]) });
  }
  for (const match of text.matchAll(PHONE)) {
    const digits = match[0].replace(/\D/g, "");
    const isReserved = /^(?:48)?0+$/.test(digits) || /^(\d)\1+$/.test(digits);
    if (!isReserved) findings.push({ kind: "phone", masked: mask(match[0]) });
  }
  for (const match of [...text.matchAll(STREET_PL), ...text.matchAll(STREET_EN)]) {
    findings.push({ kind: "address", masked: mask(match[0]) });
  }
  return findings;
}

/** Findings per file, for files with at least one finding. */
export function scanFiles(
  files: readonly string[],
): { file: string; findings: PrivacyFinding[] }[] {
  return files
    .map((file) => ({ file, findings: scanText(readFileSync(file, "utf8")) }))
    .filter((result) => result.findings.length > 0);
}

if (import.meta.main) {
  const results = scanFiles(process.argv.slice(2));
  for (const { file, findings } of results) {
    for (const finding of findings)
      process.stderr.write(`${file}: ${finding.kind} ${finding.masked}\n`);
  }
  if (results.length > 0) {
    process.stderr.write(
      "Regression fixtures must not contain personal data (anonymise them first).\n",
    );
    process.exitCode = 1;
  }
}
