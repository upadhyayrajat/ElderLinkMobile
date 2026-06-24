import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/src/store/auth";
import { bookingsApi } from "@/src/api/bookings";
import type { Booking } from "@/src/types";
import { CheckCircle, Clock, IndianRupee } from "lucide-react-native";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

function formatPaise(paise: number) {
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

const STATUS_COLOR: Record<string, string> = {
  pending:     "#F59E0B",
  confirmed:   "#006FFD",
  in_progress: "#10B981",
  completed:   "#6B7280",
};

function JobCard({ booking }: { booking: Booking }) {
  const router = useRouter();
  const color = STATUS_COLOR[booking.status] ?? "#6B7280";
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/(provider)/jobs/${booking.id}` as any)}
      activeOpacity={0.8}
    >
      <View style={styles.cardRow}>
        <View>
          <Text style={styles.cardDate}>{formatDate(booking.scheduledAt)}</Text>
          <Text style={styles.cardTime}>{formatTime(booking.scheduledAt)} · {booking.durationMinutes} min</Text>
          <Text style={styles.cardAmount}>{formatPaise(booking.amountInPaise)}</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: color + "20" }]}>
          <Text style={[styles.badgeText, { color }]}>{booking.status.replace("_", " ")}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function ProviderDashboard() {
  const { user } = useAuthStore();
  const router = useRouter();

  const { data: bookings, isLoading } = useQuery({
    queryKey: ["provider-bookings"],
    queryFn: () => bookingsApi.listForProvider().then((r) => r.data.data),
  });

  const active = (bookings ?? []).filter((b) => ["pending", "confirmed", "in_progress"].includes(b.status));
  const completed = (bookings ?? []).filter((b) => b.status === "completed");
  const earnings = completed.reduce((s, b) => s + b.amountInPaise, 0);
  const pendingCount = (bookings ?? []).filter((b) => b.status === "pending").length;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.greeting}>Hello, {user?.name?.split(" ")[0]} 👋</Text>
      <Text style={styles.sub}>Your job dashboard</Text>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Clock size={18} color="#F59E0B" />
          <Text style={styles.statValue}>{pendingCount}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
        <View style={styles.statCard}>
          <CheckCircle size={18} color="#10B981" />
          <Text style={styles.statValue}>{completed.length}</Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>
        <View style={styles.statCard}>
          <IndianRupee size={18} color="#006FFD" />
          <Text style={styles.statValue}>{formatPaise(earnings)}</Text>
          <Text style={styles.statLabel}>Earned</Text>
        </View>
      </View>

      {/* Active jobs */}
      <Text style={styles.sectionTitle}>Active jobs ({active.length})</Text>
      {isLoading ? (
        <ActivityIndicator color="#006FFD" style={{ marginTop: 20 }} />
      ) : active.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No active jobs. New bookings will appear here.</Text>
        </View>
      ) : (
        active.map((b) => <JobCard key={b.id} booking={b} />)
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F9FAFB" },
  content: { padding: 20, paddingTop: 60 },
  greeting: { fontSize: 24, fontWeight: "800", color: "#1A1A2E" },
  sub: { fontSize: 15, color: "#6B7280", marginTop: 2, marginBottom: 24 },
  statsRow: { flexDirection: "row", gap: 12, marginBottom: 28 },
  statCard: { flex: 1, backgroundColor: "#fff", borderRadius: 14, padding: 14, alignItems: "center", shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  statValue: { fontSize: 18, fontWeight: "800", color: "#1A1A2E", marginTop: 6 },
  statLabel: { fontSize: 11, color: "#6B7280", marginTop: 2 },
  sectionTitle: { fontSize: 17, fontWeight: "700", color: "#1A1A2E", marginBottom: 12 },
  card: { backgroundColor: "#fff", borderRadius: 14, padding: 16, marginBottom: 10, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  cardRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  cardDate: { fontSize: 15, fontWeight: "600", color: "#1A1A2E" },
  cardTime: { fontSize: 13, color: "#6B7280", marginTop: 2 },
  cardAmount: { fontSize: 14, fontWeight: "600", color: "#006FFD", marginTop: 4 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, marginTop: 2 },
  badgeText: { fontSize: 12, fontWeight: "700", textTransform: "capitalize" },
  empty: { backgroundColor: "#fff", borderRadius: 14, padding: 24, alignItems: "center" },
  emptyText: { fontSize: 14, color: "#6B7280", textAlign: "center" },
});
