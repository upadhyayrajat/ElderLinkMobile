// Mirrors ../ElderLink/src/i18n/locales.ts — keep in sync with the web repo.
import type { SupportedLocale } from "@/src/types";

export const DEFAULT_LOCALE: SupportedLocale = "en";

export const SUPPORTED_LOCALES: SupportedLocale[] = ["en", "hi", "ml", "ta", "kn", "mr", "te"];

// Native-script display names — shown in the switcher so each speaker
// recognizes their own language regardless of the app's current locale.
export const LOCALE_LABELS: Record<SupportedLocale, string> = {
  en: "English",
  hi: "हिन्दी",
  ml: "മലയാളം",
  ta: "தமிழ்",
  kn: "ಕನ್ನಡ",
  mr: "मराठी",
  te: "తెలుగు",
};

export function isSupportedLocale(value: string | undefined | null): value is SupportedLocale {
  return !!value && (SUPPORTED_LOCALES as string[]).includes(value);
}

export function resolveLocale(value: string | undefined | null): SupportedLocale {
  return isSupportedLocale(value) ? value : DEFAULT_LOCALE;
}
