import { Text, TouchableOpacity, StyleSheet } from "react-native";
import { Check, Globe } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { SUPPORTED_LOCALES, LOCALE_LABELS } from "@/src/i18n/locales";
import { setLocale, markPreLoginLocaleTouched } from "@/src/i18n";
import { useAuthStore } from "@/src/store/auth";
import { BottomSheet } from "@/src/components/BottomSheet";
import type { SupportedLocale } from "@/src/types";

// A globe-icon trigger + modal picker. Used on the pre-login auth screens
// and the post-login dashboard/profile screens — server sync happens
// automatically when a session exists, and pre-login picks are remembered
// so the login/register flow can push them to the server afterward.
export function LanguageSwitcherButton() {
  const [open, setOpen] = useState(false);
  const { i18n } = useTranslation();
  const user = useAuthStore((s) => s.user);

  async function handleSelect(locale: SupportedLocale) {
    if (!user) markPreLoginLocaleTouched();
    await setLocale(locale, { syncToServer: !!user });
    setOpen(false);
  }

  return (
    <>
      <TouchableOpacity style={styles.trigger} onPress={() => setOpen(true)} activeOpacity={0.7}>
        <Globe size={16} color="#006FFD" />
        <Text style={styles.triggerText}>{LOCALE_LABELS[i18n.language as SupportedLocale] ?? "English"}</Text>
      </TouchableOpacity>

      <BottomSheet visible={open} onClose={() => setOpen(false)}>
        <Text style={styles.sheetTitle}>Language</Text>
        {SUPPORTED_LOCALES.map((locale) => (
          <TouchableOpacity
            key={locale}
            style={styles.row}
            onPress={() => handleSelect(locale)}
            activeOpacity={0.7}
          >
            <Text style={styles.rowText}>{LOCALE_LABELS[locale]}</Text>
            {i18n.language === locale && <Check size={18} color="#006FFD" />}
          </TouchableOpacity>
        ))}
      </BottomSheet>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
    borderWidth: 1, borderColor: "#E5E7EB", backgroundColor: "#fff",
  },
  triggerText: { fontSize: 13, fontWeight: "600", color: "#006FFD" },
  sheetTitle: { fontSize: 17, fontWeight: "700", color: "#1A1A2E", marginBottom: 12 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  rowText: { fontSize: 16, color: "#1A1A2E" },
});
