/** Size for people: "0.4 MB", "12 MB" (one decimal below 10 MB). */
export function megabytes(bytes: number, language: string): string {
  const mb = bytes / (1024 * 1024);
  return new Intl.NumberFormat(language, { maximumFractionDigits: mb < 10 ? 1 : 0 }).format(mb);
}
