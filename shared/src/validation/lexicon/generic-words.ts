/**
 * Capitalised words that are not organisations (folded): seniority, generic role and team words,
 * countries/regions and frequent sentence words. They never become `UNKNOWN_COMPANY` on their own.
 */
export const GENERIC_CAPITALISED: ReadonlySet<string> = new Set([
  "senior",
  "junior",
  "mid",
  "lead",
  "principal",
  "staff",
  "head",
  "chief",
  "team",
  "teams",
  "zespol",
  "zespole",
  "projekt",
  "project",
  "polska",
  "polsce",
  "poland",
  "europe",
  "europa",
  "europie",
  "deutschland",
  "germany",
  "niemczech",
  "remote",
  "zdalnie",
  "agile",
  "scrum",
  "kanban",
  "frontend",
  "backend",
  "fullstack",
  "full-stack",
  "devops",
  "qa",
  "ux",
  "ui",
  "it",
  "b2b",
  "b2c",
  "saas",
  "api",
  "mvp",
  "poc",
  "ceo",
  "cto",
  "hr",
]);

/** Role words that alone don't make a job title (`as Developer`, `jako programista`). */
export const GENERIC_ROLE_WORDS: ReadonlySet<string> = new Set([
  "developer",
  "developera",
  "developerem",
  "engineer",
  "programista",
  "programisty",
  "programistka",
  "programistki",
  "inzynier",
  "inzyniera",
  "inzynierem",
  "entwickler",
  "ingenieur",
  "specialist",
  "specjalista",
  "specjalistka",
  "consultant",
  "konsultant",
  "berater",
  "intern",
  "stazysta",
  "praktikant",
]);

/** Language names (EN/PL/DE, folded) that are capitalised in text but not organisations. */
export const LANGUAGE_NAMES: ReadonlySet<string> = new Set([
  "english",
  "angielski",
  "angielskiego",
  "angielskim",
  "englisch",
  "polish",
  "polski",
  "polskiego",
  "polnisch",
  "german",
  "niemiecki",
  "niemieckiego",
  "deutsch",
  "french",
  "francuski",
  "franzosisch",
  "spanish",
  "hiszpanski",
  "spanisch",
]);

/** Words before an organisation name (`at Acme`, `w Acme`, `bei Acme`), folded. */
export const ORGANISATION_PREPOSITIONS: ReadonlySet<string> = new Set(["at", "w", "we", "bei"]);

/** Words before a job title (`as Lead Engineer`, `jako …`, `als …`), folded. */
export const TITLE_PREPOSITIONS: ReadonlySet<string> = new Set(["as", "jako", "als"]);

/** Legal-form suffixes of organisations (folded, without trailing dots). */
export const LEGAL_SUFFIXES: readonly string[] = [
  "sp. z o.o",
  "sp z o.o",
  "sp. z o. o",
  "sp. k",
  "s.a",
  "gmbh",
  "ag",
  "inc",
  "ltd",
  "llc",
  "plc",
  "corp",
  "co",
  "se",
];

/**
 * Spoken-language names that mean the same language (folded; PL/EN/DE forms). A plan in English may
 * list "English (B2)" for a profile language written as "angielski".
 */
const LANGUAGE_EQUIVALENTS: readonly (readonly string[])[] = [
  ["english", "angielski", "angielskiego", "angielskim", "englisch"],
  ["polish", "polski", "polskiego", "polnisch"],
  ["german", "niemiecki", "niemieckiego", "deutsch"],
  ["french", "francuski", "francuskiego", "franzosisch"],
  ["spanish", "hiszpanski", "hiszpanskiego", "spanisch"],
  ["italian", "wloski", "wloskiego", "italienisch"],
  ["russian", "rosyjski", "rosyjskiego", "russisch"],
  ["ukrainian", "ukrainski", "ukrainskiego", "ukrainisch"],
];

/** Index of the language a folded name refers to, or null when it isn't a known language name. */
export function languageKey(foldedName: string): number | null {
  const name = foldedName.trim();
  const index = LANGUAGE_EQUIVALENTS.findIndex((names) => names.includes(name));
  return index >= 0 ? index : null;
}
