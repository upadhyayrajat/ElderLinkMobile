import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import ICU from "i18next-icu";
import * as SecureStore from "expo-secure-store";
import { userApi } from "@/src/api/user";
import { DEFAULT_LOCALE, resolveLocale } from "./locales";
import type { SupportedLocale } from "@/src/types";

import en from "./messages/en.json";
import hi from "./messages/hi.json";
import ml from "./messages/ml.json";
import ta from "./messages/ta.json";
import kn from "./messages/kn.json";
import mr from "./messages/mr.json";
import te from "./messages/te.json";

export const LOCALE_STORAGE_KEY = "elderlink_locale";

// The message bundles are copied verbatim from the web repo, which uses
// next-intl's ICU MessageFormat syntax ("{name}", "{count, plural, ...}").
// i18next-icu lets us consume that syntax as-is instead of rewriting every
// bundle into i18next's own "{{name}}" interpolation format.
i18next.use(ICU).use(initReactI18next).init({
  resources: {
    en: { translation: en },
    hi: { translation: hi },
    ml: { translation: ml },
    ta: { translation: ta },
    kn: { translation: kn },
    mr: { translation: mr },
    te: { translation: te },
  },
  lng: DEFAULT_LOCALE,
  fallbackLng: DEFAULT_LOCALE,
  interpolation: { escapeValue: false },
});

export async function bootstrapLocale() {
  const stored = await SecureStore.getItemAsync(LOCALE_STORAGE_KEY);
  if (stored) {
    await i18next.changeLanguage(resolveLocale(stored));
  }
}

// Changes the active language, persists it on-device, and — when a session
// exists and the caller asks for it — syncs it to the server so it follows
// the user across devices. See the login/register tie-break rule in
// (auth)/verify-otp.tsx and (auth)/register.tsx for when syncToServer is set.
export async function setLocale(locale: SupportedLocale, options?: { syncToServer?: boolean }) {
  await i18next.changeLanguage(locale);
  await SecureStore.setItemAsync(LOCALE_STORAGE_KEY, locale);
  if (options?.syncToServer) {
    await userApi.updateLocale(locale).catch(() => {
      // Best-effort — the device-local preference is already applied either way.
    });
  }
}

// Tracks whether the user explicitly picked a language on a pre-login screen
// this app session — used by the login/register tie-break rule: an explicit
// pre-login pick overwrites the server's saved preference, otherwise the
// server's saved preference (returned in the auth response) wins.
let preLoginLocaleTouched = false;

export function markPreLoginLocaleTouched() {
  preLoginLocaleTouched = true;
}

export function consumePreLoginLocaleTouched() {
  const touched = preLoginLocaleTouched;
  preLoginLocaleTouched = false;
  return touched;
}

export { i18next };
