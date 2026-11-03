/** Letters NFKD can't decompose into ASCII (no combining mark to strip). */
const SPECIAL_LETTERS: Record<string, string> = {
  ł: "l",
  Ł: "L",
  ø: "o",
  Ø: "O",
  ß: "ss",
  đ: "d",
  Đ: "D",
  æ: "ae",
  Æ: "AE",
  œ: "oe",
  Œ: "OE",
  þ: "th",
  Þ: "Th",
};

/** Text without diacritics ("Łódź" → "Lodz"); file names (FR-14) and history search use it. */
export function stripDiacritics(value: string): string {
  return value
    .replace(/[łŁøØßđĐæÆœŒþÞ]/g, (letter) => SPECIAL_LETTERS[letter] ?? "")
    .normalize("NFKD")
    .replace(/\p{M}/gu, "");
}

/** For case- and diacritics-insensitive matching: "Łódź" and "LODZ" both fold to "lodz". */
export function foldForSearch(value: string): string {
  return stripDiacritics(value).toLowerCase().trim();
}
