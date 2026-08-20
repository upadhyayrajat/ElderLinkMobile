import { useState } from "react";
import type { ReactNode } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import {
  ShieldCheck, Star, Heart, Search, CalendarCheck, ShieldAlert,
  Briefcase, CheckCircle2, MapPin,
} from "lucide-react-native";
import { useStats } from "@/src/hooks/useStats";
import { markOnboardingSeen, MIN_VERIFIED_PROVIDERS_TO_SHOW } from "@/src/onboarding";
import { BottomSheet } from "@/src/components/BottomSheet";

export default function OnboardingScreen() {
  const router = useRouter();
  const { data: stats } = useStats();
  const [howItWorksOpen, setHowItWorksOpen] = useState(false);

  const showProviderCount = !!stats && stats.verifiedProviderCount >= MIN_VERIFIED_PROVIDERS_TO_SHOW;
  const showRating = !!stats && stats.averageRating !== null;

  async function handleGetStarted() {
    await markOnboardingSeen();
    router.replace("/(auth)/login");
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.inner}>
        <Text style={styles.logo}>ElderLink</Text>
        <Text style={styles.headline}>Trusted care for your parents, on your schedule</Text>
        <Text style={styles.subtitle}>
          Book verified caregivers, track visits in real time, and reach your family instantly with one-tap SOS.
        </Text>

        <View style={styles.trustRow}>
          <View style={styles.trustItem}>
            <ShieldCheck size={18} color="#006FFD" />
            <Text style={styles.trustText}>
              {showProviderCount
                ? `${stats!.verifiedProviderCount}+ verified caregivers`
                : "Verified, background-checked caregivers"}
            </Text>
          </View>
          {showRating && (
            <View style={styles.trustItem}>
              <Star size={18} color="#006FFD" />
              <Text style={styles.trustText}>{stats!.averageRating!.toFixed(1)} average rating</Text>
            </View>
          )}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.primaryBtn} onPress={handleGetStarted} activeOpacity={0.8}>
          <Text style={styles.primaryBtnText}>Get Started</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryLink} onPress={() => setHowItWorksOpen(true)} activeOpacity={0.7}>
          <Text style={styles.secondaryLinkText}>How it works</Text>
        </TouchableOpacity>
      </View>

      <BottomSheet visible={howItWorksOpen} onClose={() => setHowItWorksOpen(false)}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <Text style={styles.sheetTitle}>How ElderLink works</Text>

          <Text style={styles.sectionLabel}>For families</Text>
          <BulletRow icon={<Heart size={18} color="#006FFD" />} text="Add your parents' profiles and care needs" />
          <BulletRow icon={<Search size={18} color="#006FFD" />} text="Browse verified providers near you" />
          <BulletRow icon={<CalendarCheck size={18} color="#006FFD" />} text="Book and track visits in real time" />
          <BulletRow icon={<ShieldAlert size={18} color="#006FFD" />} text="One-tap SOS reaches your whole family" />

          <Text style={[styles.sectionLabel, styles.sectionLabelSpacing]}>For providers</Text>
          <BulletRow icon={<Briefcase size={18} color="#006FFD" />} text="Get assigned jobs from nearby families" />
          <BulletRow icon={<CheckCircle2 size={18} color="#006FFD" />} text="Accept, start, and complete bookings" />
          <BulletRow icon={<MapPin size={18} color="#006FFD" />} text="Share live location during outings" />
        </ScrollView>
      </BottomSheet>
    </View>
  );
}

function BulletRow({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <View style={styles.bulletRow}>
      {icon}
      <Text style={styles.bulletText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  inner: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 100, justifyContent: "center" },
  logo: { fontSize: 28, fontWeight: "800", color: "#006FFD", marginBottom: 24 },
  headline: { fontSize: 28, fontWeight: "800", color: "#1A1A2E", lineHeight: 36 },
  subtitle: { fontSize: 16, color: "#6B7280", marginTop: 16, lineHeight: 22 },
  trustRow: { marginTop: 32, gap: 14 },
  trustItem: { flexDirection: "row", alignItems: "center", gap: 10 },
  trustText: { fontSize: 14, fontWeight: "600", color: "#1A1A2E" },
  footer: { paddingHorizontal: 24, paddingBottom: 40, paddingTop: 12 },
  primaryBtn: { backgroundColor: "#006FFD", borderRadius: 12, paddingVertical: 16, alignItems: "center" },
  primaryBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  secondaryLink: { alignItems: "center", paddingVertical: 16 },
  secondaryLinkText: { color: "#6B7280", fontSize: 14, fontWeight: "600" },
  sheetTitle: { fontSize: 18, fontWeight: "700", color: "#1A1A2E", marginBottom: 16 },
  sectionLabel: { fontSize: 13, fontWeight: "700", color: "#006FFD", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 },
  sectionLabelSpacing: { marginTop: 20 },
  bulletRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 8 },
  bulletText: { fontSize: 15, color: "#1A1A2E", flex: 1 },
});
