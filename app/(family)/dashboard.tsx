import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/src/store/auth";
import { bookingsApi } from "@/src/api/bookings";
import { parentsApi } from "@/src/api/parents";
import type { Booking } from "@/src/types";

const STATUS_COLOR: Record<string, string> = {
  pending:     "#F59E0B",
  confirmed:   "#006FFD",
  in_progress: "#10B981",
  completed:   "#6B7280",
  cancelled:   "#EF4444",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function formatPaise(paise: number) {
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

function BookingCard({ booking }: { booking: Booking }) {
  const router = useRouter();
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/(family)/bookings/${booking.id}` as any)}
      activeOpacity={0.8}
    >
      <View style={styles.cardRow}>
        <View>
          <Text style={styles.cardDate}>{formatDate(booking.scheduledAt)}</Text>
          <Text style={styles.cardAmount}>{formatPaise(booking.amountInPaise)}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: STATUS_COLOR[booking.status] + "20" }]}>
          <Text style={[styles.statusText, { color: STATUS_COLOR[booking.status] }]}>
            {booking.status.replace("_", " ")}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function FamilyDashboard() {
  const { user } = useAuthStore();
  const router = useRouter();

  const { data: bookingsData, isLoading: loadingBookings } = useQuery({
    queryKey: ["family-bookings"],
    queryFn: () => bookingsApi.list().then((r) => r.data.data),
  });

  const { data: parentsData } = useQuery({
    queryKey: ["parents"],
    queryFn: () => parentsApi.list().then((r) => r.data.data),
  });

  const activeBookings = (bookingsData ?? [])
    .filter((b) => ["pending", "confirmed", "in_progress"].includes(b.status))
    .slice(0, 3);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.greeting}>Hello, {user?.name?.split(" ")[0]} 👋</Text>
      <Text style={styles.sub}>Here's what's happening</Text>

      {/* Quick actions */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => router.push("/(family)/parents" as any)}
          activeOpacity={0.8}
        >
          <Text style={styles.actionEmoji}>👴</Text>
          <Text style={styles.actionLabel}>Parents</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, styles.actionBtnPrimary]}
          onPress={() => router.push("/(family)/services" as any)}
          activeOpacity={0.8}
        >
          <Text style={styles.actionEmoji}>📅</Text>
          <Text style={[styles.actionLabel, { color: "#fff" }]}>Book service</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, { borderColor: "#FCA5A5" }]}
          onPress={() => router.push("/(family)/sos" as any)}
          activeOpacity={0.8}
        >
          <Text style={styles.actionEmoji}>🆘</Text>
          <Text style={[styles.actionLabel, { color: "#EF4444" }]}>SOS</Text>
        </TouchableOpacity>
      </View>

      {/* Active bookings */}
      <Text style={styles.sectionTitle}>Active bookings</Text>

      {loadingBookings ? (
        <ActivityIndicator color="#006FFD" style={{ marginTop: 16 }} />
      ) : activeBookings.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No active bookings.</Text>
          <TouchableOpacity onPress={() => router.push("/(family)/services" as any)}>
            <Text style={styles.emptyLink}>Book a service →</Text>
          </TouchableOpacity>
        </View>
      ) : (
        activeBookings.map((b) => <BookingCard key={b.id} booking={b} />)
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F9FAFB" },
  content: { padding: 20, paddingTop: 60 },
  greeting: { fontSize: 24, fontWeight: "800", color: "#1A1A2E" },
  sub: { fontSize: 15, color: "#6B7280", marginTop: 2, marginBottom: 28 },
  actionRow: { flexDirection: "row", gap: 12, marginBottom: 28 },
  actionBtn: {
    flex: 1, borderWidth: 1.5, borderColor: "#E5E7EB", borderRadius: 14,
    paddingVertical: 16, alignItems: "center", backgroundColor: "#fff",
  },
  actionBtnPrimary: { backgroundColor: "#006FFD", borderColor: "#006FFD" },
  actionEmoji: { fontSize: 22, marginBottom: 6 },
  actionLabel: { fontSize: 13, fontWeight: "600", color: "#374151" },
  sectionTitle: { fontSize: 17, fontWeight: "700", color: "#1A1A2E", marginBottom: 12 },
  card: { backgroundColor: "#fff", borderRadius: 14, padding: 16, marginBottom: 10, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  cardRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardDate: { fontSize: 15, fontWeight: "600", color: "#1A1A2E" },
  cardAmount: { fontSize: 14, color: "#6B7280", marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 12, fontWeight: "700", textTransform: "capitalize" },
  emptyCard: { backgroundColor: "#fff", borderRadius: 14, padding: 24, alignItems: "center" },
  emptyText: { fontSize: 15, color: "#6B7280", marginBottom: 8 },
  emptyLink: { fontSize: 15, color: "#006FFD", fontWeight: "600" },
});
