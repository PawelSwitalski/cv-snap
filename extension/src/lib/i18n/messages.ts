import en from "../../../public/_locales/en/messages.json";
import pl from "../../../public/_locales/pl/messages.json";

/**
 * UI strings come only from `_locales/{en,pl}/messages.json` (FR-19, ux-guide). Both files are
 * bundled so the in-app language override works without reinstalling (`chrome.i18n` follows the
 * browser language only). Keys are typed from the English file, so a missing key fails typecheck.
 */
export type MessageKey = keyof typeof en;

export const UI_LANGUAGES = ["en", "pl"] as const;
export type UiLanguage = (typeof UI_LANGUAGES)[number];

interface ChromeMessage {
  message: string;
  placeholders?: Record<string, { content: string }>;
}

const CATALOGS: Record<UiLanguage, Record<string, ChromeMessage>> = { en, pl };

/**
 * Resolves a message like `chrome.i18n.getMessage`: named `$NAME$` placeholders map to their
 * `content` (`$1`…`$9`), which are then replaced by `substitutions`.
 */
export function formatMessage(
  language: UiLanguage,
  key: MessageKey,
  substitutions: readonly string[] = [],
): string {
  const entry = CATALOGS[language][key] ?? CATALOGS.en[key];
  if (!entry) return key;
  const withPlaceholders = entry.message.replace(/\$([A-Za-z0-9_@]+)\$/g, (whole, name: string) => {
    const placeholder = entry.placeholders?.[name.toLowerCase()];
    return placeholder ? placeholder.content : whole;
  });
  return withPlaceholders.replace(/\$([1-9])/g, (whole, index: string) => {
    return substitutions[Number(index) - 1] ?? whole;
  });
}

/** Keys and placeholder names of a catalog, for the PL/EN parity test. */
export function catalogShape(language: UiLanguage): Map<string, string[]> {
  return new Map(
    Object.entries(CATALOGS[language]).map(([key, entry]) => [
      key,
      Object.keys(entry.placeholders ?? {}).sort(),
    ]),
  );
}

/** UI language: explicit override → browser UI language (`pl*` → PL, `en*` → EN) → English. */
export function resolveLanguage(
  override: LanguageOverride,
  browserLanguage: string | undefined,
): UiLanguage {
  if (override !== "auto") return override;
  const tag = (browserLanguage ?? "").toLowerCase();
  if (tag.startsWith("pl")) return "pl";
  return "en";
}

export type LanguageOverride = "auto" | UiLanguage;

export function isLanguageOverride(value: unknown): value is LanguageOverride {
  return value === "auto" || value === "en" || value === "pl";
}
