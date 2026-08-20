import { useState, useRef, useEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";
import { authApi } from "@/src/api/auth";
import { useAuthStore } from "@/src/store/auth";
import { LanguageSwitcherButton } from "@/src/components/LanguagePicker";
import { setLocale, consumePreLoginLocaleTouched, i18next } from "@/src/i18n";
import type { SupportedLocale } from "@/src/types";

export default function VerifyOtpScreen() {
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  const { setSession } = useAuthStore();

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(30);
  const inputs = useRef<TextInput[]>([]);

  useEffect(() => {
    if (resendSeconds === 0) return;
    const t = setTimeout(() => setResendSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendSeconds]);

  function handleDigit(value: string, index: number) {
    const newOtp = [...otp];
    newOtp[index] = value.replace(/\D/g, "").slice(-1);
    setOtp(newOtp);
    if (value && index < 5) inputs.current[index + 1]?.focus();
    if (newOtp.every((d) => d !== "") && newOtp[5] !== "") {
      handleVerify(newOtp.join(""));
    }
  }

  function handleKeyPress(e: any, index: number) {
    if (e.nativeEvent.key === "Backspace" && otp[index] === "" && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  }

  async function handleVerify(code?: string) {
    const finalOtp = code ?? otp.join("");
    if (finalOtp.length !== 6) {
      Alert.alert("Incomplete", "Enter all 6 digits.");
      return;
    }
    setLoading(true);
    try {
      const { data } = await authApi.verifyOtp(phone!, finalOtp);
      if (data.status === "new_user") {
        router.push({ pathname: "/(auth)/register", params: { phone } });
        return;
      }
      if (data.accessToken && data.refreshToken && data.user) {
        await setSession(data.user, data.accessToken, data.refreshToken);
        // Login tie-break: an explicit pre-login language pick wins and gets
        // pushed to the server; otherwise adopt the server's saved preference.
        if (consumePreLoginLocaleTouched()) {
          await setLocale(i18next.language as SupportedLocale, { syncToServer: true });
        } else {
          await setLocale(data.user.preferredLocale, { syncToServer: false });
        }
        // AuthGate in _layout.tsx handles the redirect
      }
    } catch (err: any) {
      const msg = err?.response?.data?.error ?? t("auth.verifyOtp.errors.verifyFailed");
      Alert.alert("Error", msg);
      setOtp(["", "", "", "", "", ""]);
      inputs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (resendSeconds > 0) return;
    try {
      await authApi.sendOtp(phone!);
      setResendSeconds(30);
      setOtp(["", "", "", "", "", ""]);
      inputs.current[0]?.focus();
    } catch {
      Alert.alert("Error", "Failed to resend OTP.");
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.inner}>
        <View style={styles.topRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.back}>
            <Text style={styles.backText}>← {t("auth.verifyOtp.changeNumber")}</Text>
          </TouchableOpacity>
          <LanguageSwitcherButton />
        </View>

        <Text style={styles.title}>{t("auth.verifyOtp.title")}</Text>
        <Text style={styles.subtitle}>
          {t("auth.verifyOtp.descriptionPrefix")} <Text style={styles.phone}>{phone}</Text>
        </Text>

        <View style={styles.otpRow}>
          {otp.map((digit, i) => (
            <TextInput
              key={i}
              ref={(ref) => { if (ref) inputs.current[i] = ref; }}
              style={[styles.otpBox, digit ? styles.otpBoxFilled : null]}
              keyboardType="number-pad"
              maxLength={1}
              value={digit}
              onChangeText={(v) => handleDigit(v, i)}
              onKeyPress={(e) => handleKeyPress(e, i)}
              selectTextOnFocus
            />
          ))}
        </View>

        <TouchableOpacity
          style={[styles.btn, loading && styles.btnDisabled]}
          onPress={() => handleVerify()}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.btnText}>{t("auth.verifyOtp.submit")}</Text>
          }
        </TouchableOpacity>

        <TouchableOpacity onPress={handleResend} disabled={resendSeconds > 0}>
          <Text style={[styles.resend, resendSeconds > 0 && styles.resendDisabled]}>
            {resendSeconds > 0 ? `Resend OTP in ${resendSeconds}s` : t("auth.verifyOtp.resendOtp")}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  inner: { flex: 1, paddingHorizontal: 24, paddingTop: 60, paddingBottom: 40 },
  topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 32 },
  back: {},
  backText: { fontSize: 16, color: "#006FFD" },
  title: { fontSize: 24, fontWeight: "700", color: "#1A1A2E" },
  subtitle: { fontSize: 15, color: "#6B7280", marginTop: 6, marginBottom: 32 },
  phone: { color: "#1A1A2E", fontWeight: "600" },
  otpRow: { flexDirection: "row", gap: 10, marginBottom: 32, justifyContent: "center" },
  otpBox: {
    width: 48, height: 56, borderWidth: 1.5, borderColor: "#E5E7EB",
    borderRadius: 10, textAlign: "center", fontSize: 22, fontWeight: "700", color: "#1A1A2E",
  },
  otpBoxFilled: { borderColor: "#006FFD" },
  btn: { backgroundColor: "#006FFD", borderRadius: 12, paddingVertical: 16, alignItems: "center", marginBottom: 20 },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  resend: { textAlign: "center", fontSize: 15, color: "#006FFD", fontWeight: "600" },
  resendDisabled: { color: "#9CA3AF" },
});
