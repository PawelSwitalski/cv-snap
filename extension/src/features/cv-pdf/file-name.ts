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

const MAX_COMPANY_LENGTH = 40;

/** ASCII-only token: diacritics removed, anything else non-alphanumeric becomes "_". */
export function toAsciiToken(value: string): string {
  return value
    .replace(/[łŁøØßđĐæÆœŒþÞ]/g, (letter) => SPECIAL_LETTERS[letter] ?? "")
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .replace(/[^A-Za-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

/**
 * `CV_{FirstName}_{LastName}_{Company}.pdf`, ASCII only (FR-14), e.g. "Łukasz Żółć" →
 * `CV_Lukasz_Zolc_Acme.pdf`. Middle names are left out; the company part is truncated to
 * 40 characters and omitted when unknown.
 */
export function buildCvFileName(fullName: string, company: string | null): string {
  const names = fullName.split(/\s+/).map(toAsciiToken).filter(Boolean);
  const nameParts = names.length > 1 ? [names[0], names.at(-1)] : names;
  const companyPart = company
    ? toAsciiToken(company).slice(0, MAX_COMPANY_LENGTH).replace(/_+$/, "")
    : "";
  const parts = ["CV", ...nameParts, companyPart].filter((part): part is string => Boolean(part));
  return `${parts.join("_")}.pdf`;
}
