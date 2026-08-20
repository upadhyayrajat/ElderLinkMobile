import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { Building2 } from "lucide-react-native";
import { useAuthStore } from "@/src/store/auth";

export default function UnsupportedRoleScreen() {
  const router = useRouter();
  const { clearSession } = useAuthStore();

  async function handleSignOut() {
    await clearSession();
    router.replace("/(auth)/login");
  }

  return (
    <View style={styles.screen}>
      <View style={styles.iconWrap}>
        <Building2 size={32} color="#006FFD" />
      </View>
      <Text style={styles.title}>Not supported on mobile yet</Text>
      <Text style={styles.body}>
        This app doesn't support your account type yet. Please use the
        ElderLink web portal to manage your account.
      </Text>
      <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut} activeOpacity={0.8}>
        <Text style={styles.signOutBtnText}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F9FAFB", alignItems: "center", justifyContent: "center", padding: 32 },
  iconWrap: { width: 64, height: 64, borderRadius: 32, backgroundColor: "#EEF4FF", alignItems: "center", justifyContent: "center", marginBottom: 20 },
  title: { fontSize: 20, fontWeight: "700", color: "#1A1A2E", marginBottom: 10, textAlign: "center" },
  body: { fontSize: 15, color: "#6B7280", textAlign: "center", lineHeight: 22, marginBottom: 32 },
  signOutBtn: { borderWidth: 1.5, borderColor: "#E5E7EB", borderRadius: 14, paddingVertical: 14, paddingHorizontal: 32 },
  signOutBtnText: { fontSize: 15, fontWeight: "700", color: "#374151" },
});
