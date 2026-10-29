import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { logger } from "@/lib/logger";
import { STORAGE_KEYS, type LocalStore } from "@/lib/storage/local-store";
import {
  formatMessage,
  isLanguageOverride,
  resolveLanguage,
  type LanguageOverride,
  type MessageKey,
  type UiLanguage,
} from "./messages";

export type Translate = (key: MessageKey, ...substitutions: string[]) => string;

interface I18nContextValue {
  language: UiLanguage;
  override: LanguageOverride;
  setOverride: (override: LanguageOverride) => void;
  t: Translate;
}

const I18nContext = createContext<I18nContextValue | null>(null);

/**
 * Provides the UI language. The first render uses the browser language (no storage read before
 * first paint); the stored override is applied as soon as it is loaded and switches the whole UI
 * without reinstalling (story 001).
 */
export function I18nProvider({
  store,
  browserLanguage,
  children,
}: {
  store: LocalStore;
  browserLanguage: string | undefined;
  children: ReactNode;
}) {
  const [override, setOverrideState] = useState<LanguageOverride>("auto");

  useEffect(() => {
    let isCurrent = true;
    store
      .get(STORAGE_KEYS.uiLanguage)
      .then((value) => {
        if (isCurrent && isLanguageOverride(value)) setOverrideState(value);
      })
      .catch((error: unknown) => {
        logger.warn("language setting unreadable", error);
      });
    return () => {
      isCurrent = false;
    };
  }, [store]);

  const setOverride = useCallback(
    (next: LanguageOverride) => {
      setOverrideState(next);
      store.set(STORAGE_KEYS.uiLanguage, next).catch((error: unknown) => {
        logger.warn("language setting not saved", error);
      });
    },
    [store],
  );

  const language = resolveLanguage(override, browserLanguage);
  const value = useMemo<I18nContextValue>(
    () => ({
      language,
      override,
      setOverride,
      t: (key, ...substitutions) => formatMessage(language, key, substitutions),
    }),
    [language, override, setOverride],
  );

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  return <I18nContext value={value}>{children}</I18nContext>;
}

function useI18nContext(): I18nContextValue {
  const context = useContext(I18nContext);
  if (!context) throw new Error("I18nProvider missing");
  return context;
}

export function useT(): Translate {
  return useI18nContext().t;
}

export function useLanguage() {
  const { language, override, setOverride } = useI18nContext();
  return { language, override, setOverride };
}
