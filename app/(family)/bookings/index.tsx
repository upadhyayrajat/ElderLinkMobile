import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { bookingsApi } from "@/src/api/bookings";
import type { Booking, BookingStatus } from "@/src/types";
import { Plus, Repeat } from "lucide-react-native";

const STATUS_COLOR: Record<BookingStatus, string> = {
  pending:     "#F59E0B",
  confirmed:   "#006FFD",
  in_progress: "#10B981",
  completed:   "#6B7280",
  cancelled:   "#EF4444",
  disputed:    "#EF4444",
  refunded:    "#9CA3AF",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    weekday: "short", day: "numeric", month: "short",
  });
}

function formatPaise(paise: number) {
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

function BookingRow({ item }: { item: Booking }) {
  const router = useRouter();
  const color = STATUS_COLOR[item.status] ?? "#6B7280";
  return (
    <TouchableOpacity
      style={styles.row}
      onPress={() => router.push(`/(family)/bookings/${item.id}` as any)}
      activeOpacity={0.8}
    >
      <View>
        <Text style={styles.rowDate}>{formatDate(item.scheduledAt)}</Text>
        <Text style={styles.rowAmount}>{formatPaise(item.amountInPaise)} · {item.durationMinutes} min</Text>
      </View>
      <View style={[styles.badge, { backgroundColor: color + "20" }]}>
        <Text style={[styles.badgeText, { color }]}>{item.status.replace("_", " ")}</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function BookingsScreen() {
  const router = useRouter();
  const { data, isLoading } = useQuery({
    queryKey: ["family-bookings"],
    queryFn: () => bookingsApi.list().then((r) => r.data.data),
  });

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>Bookings</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.recurringBtn}
            onPress={() => router.push("/(family)/recurring" as any)}
          >
            <Repeat size={20} color="#006FFD" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => router.push("/(family)/bookings/new" as any)}
          >
            <Plus size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {isLoading ? (
        <ActivityIndicator color="#006FFD" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={data ?? []}
          keyExtractor={(b) => b.id}
          renderItem={({ item }) => <BookingRow item={item} />}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No bookings yet.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F9FAFB" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16 },
  title: { fontSize: 24, fontWeight: "800", color: "#1A1A2E" },
  headerActions: { flexDirection: "row", gap: 10 },
  addBtn: { backgroundColor: "#006FFD", borderRadius: 10, padding: 8 },
  recurringBtn: { backgroundColor: "#fff", borderWidth: 1.5, borderColor: "#006FFD", borderRadius: 10, padding: 8 },
  list: { padding: 20, gap: 10 },
  row: { backgroundColor: "#fff", borderRadius: 14, padding: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "center", shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  rowDate: { fontSize: 15, fontWeight: "600", color: "#1A1A2E" },
  rowAmount: { fontSize: 13, color: "#6B7280", marginTop: 3 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontSize: 12, fontWeight: "700", textTransform: "capitalize" },
  empty: { flex: 1, justifyContent: "center", alignItems: "center", paddingTop: 60 },
  emptyText: { fontSize: 15, color: "#6B7280" },
});
