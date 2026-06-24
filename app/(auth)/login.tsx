import { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { authApi } from "@/src/api/auth";
import { INTL_PHONE_REGEX } from "@/src/utils/phone";

export default function LoginScreen() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSendOtp() {
    if (!INTL_PHONE_REGEX.test(phone.trim())) {
      Alert.alert(
        "Invalid number",
        "Enter your phone number with country code, e.g. +91XXXXXXXXXX or +1XXXXXXXXXX"
      );
      return;
    }
    setLoading(true);
    try {
      await authApi.sendOtp(phone.trim());
      router.push({ pathname: "/(auth)/verify-otp", params: { phone: phone.trim() } });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error
        ?? "Failed to send OTP. Please try again.";
      Alert.alert("Error", msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.inner}>
        <Text style={styles.logo}>ElderLink</Text>
        <Text style={styles.title}>Welcome back</Text>
        <Text style={styles.subtitle}>Enter your mobile number to continue</Text>

        <TextInput
          style={styles.phoneInput}
          placeholder="+91 98765 43210"
          placeholderTextColor="#9CA3AF"
          keyboardType="phone-pad"
          value={phone}
          onChangeText={setPhone}
          returnKeyType="done"
          onSubmitEditing={handleSendOtp}
          autoCorrect={false}
        />

        <TouchableOpacity
          style={[styles.btn, loading && styles.btnDisabled]}
          onPress={handleSendOtp}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.btnText}>Send OTP</Text>
          }
        </TouchableOpacity>

        <Text style={styles.disclaimer}>
          We'll send a 6-digit code via SMS.
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  inner: { flex: 1, paddingHorizontal: 24, paddingTop: 80, paddingBottom: 40 },
  logo: { fontSize: 28, fontWeight: "800", color: "#006FFD", marginBottom: 40 },
  title: { fontSize: 24, fontWeight: "700", color: "#1A1A2E" },
  subtitle: { fontSize: 15, color: "#6B7280", marginTop: 6, marginBottom: 32 },
  phoneInput: { borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 12, fontSize: 17, paddingHorizontal: 14, paddingVertical: 14, color: "#1A1A2E", marginBottom: 16 },
  btn: { backgroundColor: "#006FFD", borderRadius: 12, paddingVertical: 16, alignItems: "center", marginBottom: 16 },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  disclaimer: { textAlign: "center", fontSize: 13, color: "#9CA3AF" },
});
