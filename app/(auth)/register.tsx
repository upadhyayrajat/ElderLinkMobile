import { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert, ScrollView,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useAuthStore } from "@/src/store/auth";
import { authApi } from "@/src/api/auth";

export default function RegisterScreen() {
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const router = useRouter();
  const { setSession } = useAuthStore();

  const [name, setName] = useState("");
  const [role, setRole] = useState<"family" | "provider">("family");
  const [loading, setLoading] = useState(false);

  async function handleRegister() {
    if (name.trim().length < 2) {
      Alert.alert("Required", "Please enter your full name.");
      return;
    }
    setLoading(true);
    try {
      const { data } = await authApi.register(phone, name.trim(), role);
      await setSession(data.user, data.accessToken, data.refreshToken);
    } catch (err: any) {
      const msg = err?.response?.data?.error ?? "Registration failed.";
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
      <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Create account</Text>
        <Text style={styles.subtitle}>Almost done — tell us a bit about yourself</Text>

        <Text style={styles.label}>Full name</Text>
        <TextInput
          style={styles.input}
          placeholder="Priya Sharma"
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
          returnKeyType="done"
        />

        <Text style={styles.label}>I am joining as</Text>
        <View style={styles.roleRow}>
          {(["family", "provider"] as const).map((r) => (
            <TouchableOpacity
              key={r}
              style={[styles.roleBtn, role === r && styles.roleBtnActive]}
              onPress={() => setRole(r)}
            >
              <Text style={[styles.roleBtnText, role === r && styles.roleBtnTextActive]}>
                {r === "family" ? "👨‍👩‍👧 Family" : "🤝 Caregiver"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.btn, loading && styles.btnDisabled]}
          onPress={handleRegister}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.btnText}>Create account</Text>
          }
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  inner: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 40 },
  back: { marginBottom: 32 },
  backText: { fontSize: 16, color: "#006FFD" },
  title: { fontSize: 24, fontWeight: "700", color: "#1A1A2E" },
  subtitle: { fontSize: 15, color: "#6B7280", marginTop: 6, marginBottom: 32 },
  label: { fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 8 },
  input: {
    borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 14, fontSize: 16, color: "#1A1A2E", marginBottom: 24,
  },
  roleRow: { flexDirection: "row", gap: 12, marginBottom: 32 },
  roleBtn: {
    flex: 1, borderWidth: 1.5, borderColor: "#E5E7EB", borderRadius: 12,
    paddingVertical: 14, alignItems: "center",
  },
  roleBtnActive: { borderColor: "#006FFD", backgroundColor: "#EEF4FF" },
  roleBtnText: { fontSize: 15, fontWeight: "600", color: "#6B7280" },
  roleBtnTextActive: { color: "#006FFD" },
  btn: { backgroundColor: "#006FFD", borderRadius: 12, paddingVertical: 16, alignItems: "center" },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
