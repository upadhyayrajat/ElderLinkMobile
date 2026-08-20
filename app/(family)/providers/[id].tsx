import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { providersApi } from "@/src/api/providers";
import { ArrowLeft, Star, ShieldCheck, Calendar } from "lucide-react-native";

export default function ProviderDetailScreen() {
  const { id, serviceTypeId, serviceName } = useLocalSearchParams<{
    id: string;
    serviceTypeId: string;
    serviceName: string;
  }>();
  const router = useRouter();

  const { data: provider, isLoading } = useQuery({
    queryKey: ["provider", id],
    queryFn: () => providersApi.get(id).then((r) => r.data.data),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#006FFD" size="large" />
      </View>
    );
  }

  if (!provider) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Provider not found.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={22} color="#1A1A2E" />
        </TouchableOpacity>
        <Text style={styles.pageTitle}>Caregiver Profile</Text>
        <View style={{ width: 38 }} />
      </View>

      {/* Avatar + name */}
      <View style={styles.profileBlock}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>?</Text>
        </View>
        <View style={styles.ratingRow}>
          <Star size={16} color="#F59E0B" fill="#F59E0B" />
          <Text style={styles.ratingText}>{provider.rating.toFixed(1)}</Text>
          <Text style={styles.ratingCount}>({provider.reviewCount} reviews)</Text>
        </View>
        {provider.verificationStatus === "verified" && (
          <View style={styles.verifiedBadge}>
            <ShieldCheck size={14} color="#059669" />
            <Text style={styles.verifiedText}>Identity Verified</Text>
          </View>
        )}
      </View>

      {/* Trust score */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Trust Score</Text>
        <View style={styles.trustBar}>
          <View style={[styles.trustFill, { width: `${provider.trustScore}%` as any }]} />
        </View>
        <Text style={styles.trustLabel}>{provider.trustScore}/100</Text>
      </View>

      {/* Bio */}
      {provider.bio ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>About</Text>
          <Text style={styles.bioText}>{provider.bio}</Text>
        </View>
      ) : null}

      {/* Book Now */}
      <TouchableOpacity
        style={styles.bookBtn}
        onPress={() =>
          router.push({
            pathname: "/(family)/bookings/new" as any,
            params: {
              serviceTypeId,
              serviceName: serviceName ?? "",
              providerUserId: provider.userId,
            },
          })
        }
        activeOpacity={0.85}
      >
        <Calendar size={18} color="#fff" />
        <Text style={styles.bookBtnText}>Book {serviceName ?? "Service"}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F9FAFB" },
  content: { padding: 20, paddingBottom: 48 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  errorText: { fontSize: 15, color: "#6B7280" },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 24, paddingTop: 8 },
  backBtn: { width: 38, height: 38, borderRadius: 10, backgroundColor: "#fff", justifyContent: "center", alignItems: "center", shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 4, elevation: 1 },
  pageTitle: { fontSize: 17, fontWeight: "700", color: "#1A1A2E" },
  profileBlock: { alignItems: "center", marginBottom: 24 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: "#EEF4FF", justifyContent: "center", alignItems: "center", marginBottom: 12 },
  avatarText: { fontSize: 32, fontWeight: "800", color: "#006FFD" },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 },
  ratingText: { fontSize: 18, fontWeight: "700", color: "#1A1A2E" },
  ratingCount: { fontSize: 14, color: "#6B7280" },
  verifiedBadge: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "#F0FDF4", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  verifiedText: { fontSize: 13, color: "#059669", fontWeight: "600" },
  card: { backgroundColor: "#fff", borderRadius: 16, padding: 18, marginBottom: 14, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  cardTitle: { fontSize: 12, fontWeight: "700", color: "#9CA3AF", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 },
  trustBar: { height: 8, backgroundColor: "#F3F4F6", borderRadius: 4, overflow: "hidden", marginBottom: 6 },
  trustFill: { height: "100%", backgroundColor: "#006FFD", borderRadius: 4 },
  trustLabel: { fontSize: 14, fontWeight: "600", color: "#374151" },
  bioText: { fontSize: 14, color: "#374151", lineHeight: 22 },
  bookBtn: { backgroundColor: "#006FFD", borderRadius: 16, paddingVertical: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 8 },
  bookBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
