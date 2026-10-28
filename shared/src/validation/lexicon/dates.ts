/**
 * Month names (PL/EN/DE, folded). Long Polish stems match every case form by prefix (stycznia,
 * styczniu); short names and abbreviations must match exactly, so "Marketing 2020" is not March.
 * A month word only counts as a date next to a year.
 */
const MONTHS: readonly { month: number; exact: readonly string[]; stems: readonly string[] }[] = [
  { month: 1, exact: ["january", "jan", "januar", "janner"], stems: ["stycz"] },
  { month: 2, exact: ["february", "feb", "februar", "luty", "lutego", "lutym"], stems: [] },
  { month: 3, exact: ["march", "mar", "marz", "marzec", "marca", "marcu"], stems: [] },
  { month: 4, exact: ["april", "apr"], stems: ["kwiet", "kwietn"] },
  { month: 5, exact: ["may", "mai", "maj", "maja", "maju"], stems: [] },
  { month: 6, exact: ["june", "jun", "juni"], stems: ["czerw"] },
  { month: 7, exact: ["july", "jul", "juli", "lipiec", "lipca", "lipcu"], stems: [] },
  { month: 8, exact: ["august", "aug"], stems: ["sierp"] },
  { month: 9, exact: ["september", "sep", "sept"], stems: ["wrzes"] },
  { month: 10, exact: ["october", "oct", "oktober", "okt"], stems: ["pazdz"] },
  { month: 11, exact: ["november", "nov"], stems: ["listop"] },
  { month: 12, exact: ["december", "dec", "dezember", "dez"], stems: ["grudz", "grudn"] },
];

/** Month number of a folded word, when it is a month name or abbreviation. */
export function monthOf(folded: string): number | null {
  for (const { month, exact, stems } of MONTHS) {
    if (exact.includes(folded)) return month;
    if (stems.some((stem) => folded.startsWith(stem) && folded.length <= stem.length + 5)) {
      return month;
    }
  }
  return null;
}

/** "Present" at the end of a date range (folded): `2021 – obecnie`, `since 2020 to now`. */
export const PRESENT_WORDS: ReadonlySet<string> = new Set([
  "present",
  "now",
  "current",
  "currently",
  "today",
  "obecnie",
  "teraz",
  "nadal",
  "dzis",
  "dotychczas",
  "heute",
  "aktuell",
  "jetzt",
  "gegenwart",
]);
