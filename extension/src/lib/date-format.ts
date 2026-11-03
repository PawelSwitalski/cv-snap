/**
 * Cached `Intl.DateTimeFormat`s: building one per call costs far more than formatting, and a
 * History list formats two dates per row (500 rows must show in < 500 ms, intent 004).
 */
const formatters = new Map<string, Intl.DateTimeFormat>();

export function dateFormatter(language: string, dateStyle: "medium" | "long"): Intl.DateTimeFormat {
  const key = `${language}|${dateStyle}`;
  let formatter = formatters.get(key);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(language, { dateStyle });
    formatters.set(key, formatter);
  }
  return formatter;
}
