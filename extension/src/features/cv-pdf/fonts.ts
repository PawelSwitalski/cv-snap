import { Font } from "@react-pdf/renderer";

/**
 * Embedded fonts for the CV. The standard PDF fonts lack Polish letters (ł, ż, ś…), so Noto Sans
 * (OFL-1.1, Latin/Latin Extended/Greek/Cyrillic) is embedded; licence in `public/fonts/OFL.txt`.
 * Scripts outside Noto Sans (Arabic, CJK…) are best effort for now.
 */
export const CV_FONT_FAMILY = "NotoSans";

export const CV_FONT_FILES = {
  regular: "NotoSans-Regular.ttf",
  bold: "NotoSans-Bold.ttf",
  italic: "NotoSans-Italic.ttf",
} as const;

let registeredFor: string | null = null;

/**
 * Registers the CV fonts once. `resolveFont` maps a file name to a URL or path: the extension's
 * `browser.runtime.getURL("/fonts/…")`, or a file path in Node tests.
 */
export function registerCvFonts(resolveFont: (fileName: string) => string): void {
  const key = resolveFont(CV_FONT_FILES.regular);
  if (registeredFor === key) return;
  Font.register({
    family: CV_FONT_FAMILY,
    fonts: [
      { src: resolveFont(CV_FONT_FILES.regular), fontWeight: 400 },
      { src: resolveFont(CV_FONT_FILES.bold), fontWeight: 700 },
      { src: resolveFont(CV_FONT_FILES.italic), fontWeight: 400, fontStyle: "italic" },
    ],
  });
  // No automatic hyphenation: it would split names, technologies and dates.
  Font.registerHyphenationCallback((word) => [word]);
  registeredFor = key;
}

/**
 * Makes the next document parse the CV fonts afresh. Parsed fonts carry glyph state between
 * documents: after a render whose regular text had "Ó" but no plain "O", later PDFs lost or
 * garbled "O" in the text layer ("RODO" → "R@D@"), breaking copy-paste and ATS parsing.
 * (`Font.reset()` keeps the finished load promise, so it never reloads; `Font.clear()` would also
 * drop react-pdf's built-in fallback fonts.)
 */
export function refreshCvFonts(): void {
  for (const source of Font.getRegisteredFonts()[CV_FONT_FAMILY]?.sources ?? []) {
    source.data = null;
    source.loadResultPromise = null;
  }
}
