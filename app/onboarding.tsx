import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, Animated, useWindowDimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import Svg, { Defs, LinearGradient as SvgLinearGradient, Stop, Rect } from "react-native-svg";
import {
  useFonts, PlusJakartaSans_400Regular, PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold, PlusJakartaSans_800ExtraBold,
} from "@expo-google-fonts/plus-jakarta-sans";
import {
  ShieldCheck, Star, Heart, Search, CalendarCheck, ShieldAlert,
  Briefcase, CheckCircle2, MapPin,
} from "lucide-react-native";
import { useStats } from "@/src/hooks/useStats";
import { markOnboardingSeen, MIN_VERIFIED_PROVIDERS_TO_SHOW } from "@/src/onboarding";
import { BottomSheet } from "@/src/components/BottomSheet";
import { LoadingScreen } from "@/src/components/LoadingScreen";

const GRADIENT_FROM = "#006FFD";
const GRADIENT_TO = "#5B3DF5";

export default function OnboardingScreen() {
  const router = useRouter();
  const { height: windowHeight } = useWindowDimensions();
  const { data: stats } = useStats();
  const [howItWorksOpen, setHowItWorksOpen] = useState(false);

  const [fontsLoaded] = useFonts({
    PlusJakartaSans_400Regular, PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold, PlusJakartaSans_800ExtraBold,
  });

  const fade = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    if (!fontsLoaded) return;
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, [fontsLoaded]);

  if (!fontsLoaded) return <LoadingScreen />;

  const showProviderCount = !!stats && stats.verifiedProviderCount >= MIN_VERIFIED_PROVIDERS_TO_SHOW;
  const showRating = !!stats && stats.averageRating !== null;
  const heroHeight = Math.round(windowHeight * 0.44);

  async function handleGetStarted() {
    await markOnboardingSeen();
    router.replace("/(auth)/login");
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <View style={[styles.hero, { height: heroHeight }]}>
        <Svg style={StyleSheet.absoluteFill}>
          <Defs>
            <SvgLinearGradient id="heroGrad" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={GRADIENT_FROM} />
              <Stop offset="1" stopColor={GRADIENT_TO} />
            </SvgLinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#heroGrad)" />
        </Svg>
        <View style={[styles.decor, styles.decor1]} />
        <View style={[styles.decor, styles.decor2]} />
        <View style={[styles.decor, styles.decor3]} />

        <Animated.View style={[styles.heroContent, { opacity: fade, transform: [{ translateY }] }]}>
          <Text style={styles.logo}>ElderLink</Text>
          <Text style={styles.headline}>Trusted care for your parents, on your schedule</Text>
          <Text style={styles.subtitle}>
            Book verified caregivers, track visits in real time, and reach your family instantly with one-tap SOS.
          </Text>
        </Animated.View>
      </View>

      <Animated.View style={[styles.panel, { opacity: fade, transform: [{ translateY }] }]}>
        <ScrollView contentContainerStyle={styles.panelInner}>
          <View style={styles.trustChip}>
            <View style={[styles.trustIconWrap, styles.trustIconWrapBlue]}>
              <ShieldCheck size={18} color={GRADIENT_FROM} />
            </View>
            <Text style={styles.trustText}>
              {showProviderCount
                ? `${stats!.verifiedProviderCount}+ verified caregivers`
                : "Verified, background-checked caregivers"}
            </Text>
          </View>
          {showRating && (
            <View style={styles.trustChip}>
              <View style={[styles.trustIconWrap, styles.trustIconWrapAmber]}>
                <Star size={18} color="#D97706" />
              </View>
              <Text style={styles.trustText}>{stats!.averageRating!.toFixed(1)} average rating</Text>
            </View>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.primaryBtn} onPress={handleGetStarted} activeOpacity={0.85}>
            <Text style={styles.primaryBtnText}>Get Started</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryLink} onPress={() => setHowItWorksOpen(true)} activeOpacity={0.7}>
            <Text style={styles.secondaryLinkText}>How it works</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      <BottomSheet visible={howItWorksOpen} onClose={() => setHowItWorksOpen(false)}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <Text style={styles.sheetTitle}>How ElderLink works</Text>

          <Text style={styles.sectionLabel}>For families</Text>
          <BulletRow icon={<Heart size={16} color={GRADIENT_FROM} />} text="Add your parents' profiles and care needs" />
          <BulletRow icon={<Search size={16} color={GRADIENT_FROM} />} text="Browse verified providers near you" />
          <BulletRow icon={<CalendarCheck size={16} color={GRADIENT_FROM} />} text="Book and track visits in real time" />
          <BulletRow icon={<ShieldAlert size={16} color={GRADIENT_FROM} />} text="One-tap SOS reaches your whole family" />

          <Text style={[styles.sectionLabel, styles.sectionLabelSpacing]}>For providers</Text>
          <BulletRow icon={<Briefcase size={16} color={GRADIENT_FROM} />} text="Get assigned jobs from nearby families" />
          <BulletRow icon={<CheckCircle2 size={16} color={GRADIENT_FROM} />} text="Accept, start, and complete bookings" />
          <BulletRow icon={<MapPin size={16} color={GRADIENT_FROM} />} text="Share live location during outings" />
        </ScrollView>
      </BottomSheet>
    </View>
  );
}

function BulletRow({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <View style={styles.bulletRow}>
      <View style={styles.bulletIconWrap}>{icon}</View>
      <Text style={styles.bulletText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },

  hero: { justifyContent: "flex-end", overflow: "hidden" },
  decor: { position: "absolute", borderRadius: 999, backgroundColor: "rgba(255,255,255,0.12)" },
  decor1: { width: 200, height: 200, top: -70, right: -50 },
  decor2: { width: 130, height: 130, bottom: -40, left: -30, backgroundColor: "rgba(255,255,255,0.09)" },
  decor3: { width: 70, height: 70, top: 70, right: 56, backgroundColor: "rgba(255,255,255,0.16)" },
  heroContent: { paddingHorizontal: 24, paddingBottom: 40 },
  logo: { fontFamily: "PlusJakartaSans_800ExtraBold", fontSize: 24, color: "#fff", marginBottom: 20, letterSpacing: 0.3 },
  headline: { fontFamily: "PlusJakartaSans_800ExtraBold", fontSize: 28, color: "#fff", lineHeight: 36 },
  subtitle: { fontFamily: "PlusJakartaSans_400Regular", fontSize: 15, color: "rgba(255,255,255,0.88)", marginTop: 14, lineHeight: 21 },

  panel: {
    flex: 1, backgroundColor: "#fff", marginTop: -28,
    borderTopLeftRadius: 32, borderTopRightRadius: 32,
  },
  panelInner: { paddingHorizontal: 24, paddingTop: 28, gap: 14 },
  trustChip: { flexDirection: "row", alignItems: "center", gap: 12 },
  trustIconWrap: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  trustIconWrapBlue: { backgroundColor: "rgba(0,111,253,0.1)" },
  trustIconWrapAmber: { backgroundColor: "rgba(217,119,6,0.1)" },
  trustText: { fontFamily: "PlusJakartaSans_600SemiBold", fontSize: 14, color: "#1A1A2E" },

  footer: { paddingHorizontal: 24, paddingBottom: 40, paddingTop: 12 },
  primaryBtn: {
    backgroundColor: GRADIENT_FROM, borderRadius: 14, paddingVertical: 17, alignItems: "center",
    shadowColor: GRADIENT_FROM, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.32, shadowRadius: 18, elevation: 8,
  },
  primaryBtnText: { fontFamily: "PlusJakartaSans_700Bold", color: "#fff", fontSize: 16 },
  secondaryLink: { alignItems: "center", paddingVertical: 16 },
  secondaryLinkText: { fontFamily: "PlusJakartaSans_600SemiBold", color: "#6B7280", fontSize: 14 },

  sheetTitle: { fontFamily: "PlusJakartaSans_700Bold", fontSize: 18, color: "#1A1A2E", marginBottom: 16 },
  sectionLabel: {
    fontFamily: "PlusJakartaSans_700Bold", fontSize: 13, color: GRADIENT_FROM,
    textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10,
  },
  sectionLabelSpacing: { marginTop: 20 },
  bulletRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 6 },
  bulletIconWrap: {
    width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center",
    backgroundColor: "rgba(0,111,253,0.08)",
  },
  bulletText: { fontFamily: "PlusJakartaSans_400Regular", fontSize: 15, color: "#1A1A2E", flex: 1 },
});
