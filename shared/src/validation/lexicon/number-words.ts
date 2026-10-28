/**
 * Spelled-out numbers (PL/EN/DE, folded) → value. Starts at 2: "one/jeden/ein" are mostly
 * articles ("one of", "ein Team") and would flag ordinary sentences. Polish case forms included
 * (pięć, pięciu, pięcioma).
 */
const groups: [number, string[]][] = [
  [2, ["two", "dwa", "dwie", "dwoch", "dwom", "dwoma", "dwu", "zwei"]],
  [3, ["three", "trzy", "trzech", "trzem", "trzema", "drei"]],
  [4, ["four", "cztery", "czterech", "czterem", "czterema", "vier"]],
  [5, ["five", "piec", "pieciu", "piecioma", "funf", "fuenf"]],
  [6, ["six", "szesc", "szesciu", "szescioma", "sechs"]],
  [7, ["seven", "siedem", "siedmiu", "siedmioma", "sieben"]],
  [8, ["eight", "osiem", "osmiu", "osmioma", "acht"]],
  [9, ["nine", "dziewiec", "dziewieciu", "dziewiecioma", "neun"]],
  [10, ["ten", "dziesiec", "dziesieciu", "dziesiecioma", "zehn"]],
  [11, ["eleven", "jedenascie", "jedenastu", "elf"]],
  [12, ["twelve", "dwanascie", "dwunastu", "zwolf"]],
  [13, ["thirteen", "trzynascie", "trzynastu", "dreizehn"]],
  [14, ["fourteen", "czternascie", "czternastu", "vierzehn"]],
  [15, ["fifteen", "pietnascie", "pietnastu", "funfzehn"]],
  [16, ["sixteen", "szesnascie", "szesnastu", "sechzehn"]],
  [17, ["seventeen", "siedemnascie", "siedemnastu", "siebzehn"]],
  [18, ["eighteen", "osiemnascie", "osiemnastu", "achtzehn"]],
  [19, ["nineteen", "dziewietnascie", "dziewietnastu", "neunzehn"]],
  [20, ["twenty", "dwadziescia", "dwudziestu", "zwanzig"]],
  [30, ["thirty", "trzydziesci", "trzydziestu", "dreissig"]],
  [40, ["forty", "czterdziesci", "czterdziestu", "vierzig"]],
  [50, ["fifty", "piecdziesiat", "piecdziesieciu", "funfzig"]],
  [60, ["sixty", "szescdziesiat", "szescdziesieciu", "sechzig"]],
  [70, ["seventy", "siedemdziesiat", "siedemdziesieciu", "siebzig"]],
  [80, ["eighty", "osiemdziesiat", "osiemdziesieciu", "achtzig"]],
  [90, ["ninety", "dziewiecdziesiat", "dziewiecdziesieciu", "neunzig"]],
  [100, ["hundred", "sto", "stu", "hundert"]],
];

export const NUMBER_WORDS: ReadonlyMap<string, number> = new Map(
  groups.flatMap(([value, forms]) => forms.map((form) => [form, value] as const)),
);

/** Multiplier words after a number (`5 tys.`, `2 mln`, `3k`), folded. */
export const MULTIPLIERS: ReadonlyMap<string, number> = new Map([
  ["k", 1_000],
  ["tys", 1_000],
  ["tysiace", 1_000],
  ["tysiecy", 1_000],
  ["thousand", 1_000],
  ["tausend", 1_000],
  ["m", 1_000_000],
  ["mln", 1_000_000],
  ["mio", 1_000_000],
  ["million", 1_000_000],
  ["millionen", 1_000_000],
  ["milion", 1_000_000],
  ["miliony", 1_000_000],
  ["milionow", 1_000_000],
]);

/** Words marking a percentage after a number (folded prefixes, any case form). */
export const PERCENT_WORD_PREFIXES = ["percent", "procent", "prozent"] as const;
