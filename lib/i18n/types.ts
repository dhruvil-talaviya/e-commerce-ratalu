/** Supported UI languages for the Ratalu storefront. */
export type Language = "en" | "hi" | "gu";

export const LANGUAGE_META: Record<Language, { label: string; nativeLabel: string; lang: string }> = {
  en: { label: "English",   nativeLabel: "English",    lang: "en" },
  hi: { label: "Hindi",     nativeLabel: "हिन्दी",       lang: "hi" },
  gu: { label: "Gujarati",  nativeLabel: "ગુજરાતી",     lang: "gu" },
};

/** Flat key → string translation dictionary. */
export type TranslationDict = Record<string, string>;
