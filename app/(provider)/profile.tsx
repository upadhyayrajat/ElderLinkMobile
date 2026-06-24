import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/src/store/auth";
import { api } from "@/src/api/client";

export default function ProviderProfileScreen() {
  const { user, clearSession } = useAuthStore();
  const router = useRouter();

  const { data: profileData } = useQuery({
    queryKey: ["provider-profile"],
    queryFn: () => api.get("/api/provider/profile").then((r) => r.data),
  });

  const profile = profileData?.data;

  function handleSignOut() {
    Alert.alert("Sign out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: async () => {
          await clearSession();
          router.replace("/(auth)/login");
        },
      },
    ]);
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>My Profile</Text>

      <View style={styles.avatarContainer}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{user?.name?.charAt(0).toUpperCase()}</Text>
        </View>
        <Text style={styles.name}>{user?.name}</Text>
        <Text style={styles.phone}>{user?.phone}</Text>
      </View>

      {profile && (
        <View style={styles.card}>
          <Row label="Status" value={profile.verificationStatus} />
          <Row label="Trust score" value={`${profile.trustScore}/100`} />
          <Row label="Rating" value={`${profile.rating ?? 0}/5 (${profile.reviewCount ?? 0} reviews)`} />
          {profile.rejectionReason && (
            <View style={styles.rejectionBox}>
              <Text style={styles.rejectionLabel}>Rejection reason</Text>
              <Text style={styles.rejectionText}>{profile.rejectionReason}</Text>
            </View>
          )}
        </View>
      )}

      <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut} activeOpacity={0.8}>
        <Text style={styles.signOutText}>Sign out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F9FAFB" },
  content: { padding: 20, paddingTop: 60 },
  title: { fontSize: 24, fontWeight: "800", color: "#1A1A2E", marginBottom: 28 },
  avatarContainer: { alignItems: "center", marginBottom: 28 },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: "#EEF4FF", justifyContent: "center", alignItems: "center", marginBottom: 12 },
  avatarText: { fontSize: 28, fontWeight: "800", color: "#006FFD" },
  name: { fontSize: 20, fontWeight: "700", color: "#1A1A2E" },
  phone: { fontSize: 15, color: "#6B7280", marginTop: 4 },
  card: { backgroundColor: "#fff", borderRadius: 14, padding: 16, marginBottom: 20, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  rowLabel: { fontSize: 14, color: "#6B7280" },
  rowValue: { fontSize: 14, fontWeight: "600", color: "#1A1A2E" },
  rejectionBox: { backgroundColor: "#FEF2F2", borderRadius: 8, padding: 12, marginTop: 10 },
  rejectionLabel: { fontSize: 12, fontWeight: "700", color: "#991B1B", marginBottom: 4 },
  rejectionText: { fontSize: 13, color: "#7F1D1D" },
  signOutBtn: { backgroundColor: "#FEF2F2", borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  signOutText: { color: "#EF4444", fontSize: 15, fontWeight: "700" },
});
