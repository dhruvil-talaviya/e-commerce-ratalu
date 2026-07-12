"use client";

import * as React from "react";
import type { Language } from "@/lib/i18n/types";
import { TRANSLATIONS, EN } from "@/lib/i18n/translations";
import { LANGUAGE_META } from "@/lib/i18n/types";

const STORAGE_KEY = "ratalu.language.v1";

interface LanguageContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  /** Translate a key. Supports {placeholder} interpolation. */
  t: (key: keyof typeof EN, vars?: Record<string, string | number>) => string;
  /** BCP-47 lang attribute value for the html element */
  htmlLang: string;
}

const LanguageContext = React.createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = React.useState<Language>("en");

  // Hydrate from localStorage
  React.useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as Language | null;
      if (saved && saved in TRANSLATIONS) {
        setLanguageState(saved);
      }
    } catch {
      // Ignore corrupt storage
    }
  }, []);

  // Persist language choice
  const setLanguage = React.useCallback((lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // Ignore storage errors
    }
  }, []);

  // Update <html lang="…"> attribute dynamically
  React.useEffect(() => {
    document.documentElement.lang = LANGUAGE_META[language].lang;
  }, [language]);

  const t = React.useCallback(
    (key: keyof typeof EN, vars?: Record<string, string | number>): string => {
      const dict = TRANSLATIONS[language] ?? EN;
      let str: string = (dict[key] ?? EN[key] ?? key) as string;
      if (vars) {
        for (const [k, v] of Object.entries(vars)) {
          str = str.replace(`{${k}}`, String(v));
        }
      }
      return str;
    },
    [language]
  );

  const value = React.useMemo(
    () => ({
      language,
      setLanguage,
      t,
      htmlLang: LANGUAGE_META[language].lang,
    }),
    [language, setLanguage, t]
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = React.useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}
