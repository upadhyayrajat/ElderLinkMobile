import { useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import * as SecureStore from "expo-secure-store";
import { useRouter } from "expo-router";
import { ShieldCheck, FileText, Trash2, ChevronRight } from "lucide-react-native";
import { userApi } from "@/src/api/user";
import { authApi } from "@/src/api/auth";
import { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY } from "@/src/api/client";
import { useAuthStore } from "@/src/store/auth";

const COLLECT_ITEMS = [
  { title: "Health & care information", detail: "Medical notes, mobility status, and wellness observations about your elderly relative." },
  { title: "Booking & service history", detail: "Records of care visits, services booked, and payments made through ElderLink." },
  { title: "Location data (during visits)", detail: "Live GPS location shared by the caregiver during an active booking — visible only to you." },
  { title: "Phone number & profile", detail: "Your contact details to enable booking, notifications, and account management." },
];

const ASSURANCES = [
  { icon: FileText, text: "Data is stored in India (Mumbai region) in compliance with DPDP localisation requirements." },
  { icon: ShieldCheck, text: "Data is never sold to third parties. It is used solely to provide ElderLink services." },
  { icon: Trash2, text: "You can request erasure of your data at any time from your account settings." },
];

export default function ConsentScreen() {
  const router = useRouter();
  const { user, setConsentGiven } = useAuthStore();
  const [loading, setLoading] = useState(false);

  async function handleConsent() {
    setLoading(true);
    try {
      await userApi.recordConsent();

      // The access token that's currently stored still carries the old
      // consentGiven: false claim — JWTs are stateless, so refresh it now
      // rather than waiting for a 401 to trigger the implicit refresh.
      const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
      if (refreshToken) {
        const { data } = await authApi.refresh(refreshToken);
        await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, data.accessToken);
      }

      await setConsentGiven(true);
      router.replace(user?.role === "provider" ? "/(provider)/dashboard" : "/(family)/dashboard");
    } catch (err: any) {
      const msg = err?.response?.data?.error ?? "Could not record your consent. Please try again.";
      Alert.alert("Error", msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.iconWrap}>
        <ShieldCheck size={28} color="#fff" />
      </View>
      <Text style={styles.title}>Your data, your control</Text>
      <Text style={styles.description}>
        Before we get started, we need your explicit consent to store and process health
        and care data for your elderly relative, as required by the Digital Personal Data
        Protection Act 2023 (DPDP Act).
      </Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>What we collect</Text>
        {COLLECT_ITEMS.map((item) => (
          <View key={item.title} style={styles.collectRow}>
            <ChevronRight size={16} color="#006FFD" style={{ marginTop: 2 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.collectItemTitle}>{item.title}</Text>
              <Text style={styles.collectItemDetail}>{item.detail}</Text>
            </View>
          </View>
        ))}

        <View style={styles.divider} />

        {ASSURANCES.map(({ icon: Icon, text }) => (
          <View key={text} style={styles.assuranceRow}>
            <Icon size={16} color="#10B981" style={{ marginTop: 1 }} />
            <Text style={styles.assuranceText}>{text}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity
        style={[styles.submitBtn, loading && styles.btnDisabled]}
        onPress={handleConsent}
        disabled={loading}
        activeOpacity={0.85}
      >
        {loading
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.submitBtnText}>I understand and consent</Text>
        }
      </TouchableOpacity>
      <Text style={styles.footerNote}>
        By continuing, you confirm that you are at least 18 years old and agree to
        ElderLink's data processing as described above.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F9FAFB" },
  content: { padding: 24, paddingTop: 60, paddingBottom: 48, alignItems: "center" },
  iconWrap: { width: 56, height: 56, borderRadius: 16, backgroundColor: "#006FFD", alignItems: "center", justifyContent: "center", marginBottom: 16 },
  title: { fontSize: 22, fontWeight: "800", color: "#1A1A2E", textAlign: "center", marginBottom: 8 },
  description: { fontSize: 14, color: "#6B7280", textAlign: "center", lineHeight: 20, marginBottom: 24 },
  card: { width: "100%", backgroundColor: "#fff", borderRadius: 16, padding: 18, marginBottom: 24, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 6, elevation: 1 },
  cardTitle: { fontSize: 12, fontWeight: "700", color: "#9CA3AF", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 14 },
  collectRow: { flexDirection: "row", gap: 10, marginBottom: 14 },
  collectItemTitle: { fontSize: 14, fontWeight: "600", color: "#1A1A2E" },
  collectItemDetail: { fontSize: 12, color: "#6B7280", marginTop: 2, lineHeight: 17 },
  divider: { height: 1, backgroundColor: "#F3F4F6", marginVertical: 6 },
  assuranceRow: { flexDirection: "row", gap: 8, backgroundColor: "#F0FDF4", borderRadius: 10, padding: 10, marginTop: 8 },
  assuranceText: { flex: 1, fontSize: 12, color: "#166534", lineHeight: 17 },
  submitBtn: { width: "100%", backgroundColor: "#006FFD", borderRadius: 14, paddingVertical: 16, alignItems: "center", marginBottom: 14 },
  btnDisabled: { opacity: 0.6 },
  submitBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  footerNote: { fontSize: 12, color: "#9CA3AF", textAlign: "center", lineHeight: 17 },
});
